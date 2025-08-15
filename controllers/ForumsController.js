const { supabaseDb } = require('../config/database');

class ForumsController {
  static async createForum(req, res) {
    try {
      const {
        title,
        description,
        incident_date,
        address,
        latitude,
        longitude,
        priority = 'medium',
        is_anonymous = false,
        tags = [],
        media_urls = []
      } = req.body;

      if (!title || !description || !incident_date || !address || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: title, description, incident_date, address, latitude, longitude'
        });
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'
        });
      }

      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const { data: forum, error: forumError } = await supabaseDb
        .from('forums')
        .insert({
          user_id: user_id,
          title: title.trim(),
          description: description.trim(),
          incident_date: incident_date,
          address: address.trim(),
          latitude: lat,
          longitude: lon,
          priority: priority,
          is_anonymous: is_anonymous,
          status: 'open' 
        })
        .select('id, title, created_at')
        .single();

      if (forumError) {
        console.error('Error creating forum:', forumError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create forum post',
          error: forumError.message
        });
      }

      const forum_id = forum.id;

      console.log('🏷️ Tags received:', tags);
      if (tags && tags.length > 0) {
        const tagInserts = [];
        
        for (const tagName of tags) {
          const normalizedName = tagName.trim().toLowerCase();
          console.log('🔄 Processing tag:', tagName, '→', normalizedName);
          if (!normalizedName) continue;

          let tagId;
          const { data: existingTag } = await supabaseDb
            .from('tags')
            .select('id')
            .eq('name', normalizedName)
            .single();

          if (existingTag) {
            tagId = existingTag.id;
            console.log('✅ Found existing tag:', normalizedName, 'with ID:', tagId);
            await supabaseDb
              .from('tags')
              .update({ usage_count: supabaseDb.raw('usage_count + 1') })
              .eq('id', tagId);
          } else {
            console.log('🆕 Creating new tag:', normalizedName);
            const slug = normalizedName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const { data: newTag } = await supabaseDb
              .from('tags')
              .insert({
                name: normalizedName,
                slug: slug,
                usage_count: 1
              })
              .select('id')
              .single();
            tagId = newTag?.id;
            console.log('✅ Created new tag with ID:', tagId);
          }

          if (tagId) {
            tagInserts.push({ forum_id, tag_id: tagId });
            console.log('📌 Added to tagInserts:', { forum_id, tag_id: tagId });
          }
        }

        if (tagInserts.length > 0) {
          console.log('🔗 Inserting forum_tags relationships:', tagInserts);
          const { error: tagError } = await supabaseDb
            .from('forum_tags')
            .insert(tagInserts);
          
          if (tagError) {
            console.error('❌ Error inserting forum_tags:', tagError);
          } else {
            console.log('✅ Successfully inserted forum_tags');
          }
        }
      }

      if (media_urls && media_urls.length > 0) {
        const mediaInserts = media_urls.slice(0, 3).map((url, index) => ({ 
          forum_id,
          file_url: url.url,
          file_type: url.type || 'image',
          file_name: url.name || `image_${index + 1}`,
          file_size: url.size || null,
          is_primary: index === 0 
        }));

        await supabaseDb
          .from('forum_media')
          .insert(mediaInserts);
      }

      res.status(201).json({
        success: true,
        message: 'Forum post created successfully',
        data: {
          id: forum_id,
          title: forum.title,
          created_at: forum.created_at
        }
      });

    } catch (error) {
      console.error('Error in createForum:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getForums(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        priority, 
        search,
        tags 
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = supabaseDb
        .from('forums')
        .select(`
          id,
          title,
          description,
          incident_date,
          address,
          latitude,
          longitude,
          status,
          priority,
          is_anonymous,
          upvotes,
          downvotes,
          created_at,
          updated_at,
          users!forums_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          forum_media (
            file_url,
            file_type,
            is_primary
          ),
          forum_tags (
            tags (
              name,
              slug
            )
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);
      if (search) {
        query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error getting forums:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to get forums',
          error: error.message
        });
      }

      res.json({
        success: true,
        data: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('Error in getForums:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getForumById(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await supabaseDb
        .from('forums')
        .select(`
          *,
          users!forums_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          forum_media (
            id,
            file_url,
            file_type,
            file_name,
            is_primary
          ),
          forum_tags (
            tags (
              id,
              name,
              slug
            )
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Forum post not found'
          });
        }
        console.error('Error getting forum:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to get forum post',
          error: error.message
        });
      }

      res.json({
        success: true,
        data
      });

    } catch (error) {
      console.error('Error in getForumById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = ForumsController;
