const { supabaseAdmin } = require('../config/supabase');
const NotificationService = require('../services/NotificationService');

class ForumsController {
  static async getHomeSummary(req, res) {
    try {
      const nowUtc = new Date();
      const wibOffsetMs = 7 * 60 * 60 * 1000;
      const nowWib = new Date(nowUtc.getTime() + wibOffsetMs);
      const threeDaysAgoWib = new Date(nowWib.getTime() - 3 * 24 * 60 * 60 * 1000);

      const toIsoUtc = (d) => new Date(d.getTime() - wibOffsetMs).toISOString();

      const sinceIsoUtc = toIsoUtc(threeDaysAgoWib);

      const { data: allForums, error: forumsErr } = await supabaseAdmin
        .from('forums')
        .select('id, status, created_at, latitude, longitude, title, address')
        .is('deleted_at', null);
      if (forumsErr) throw forumsErr;

      const totalReports = (allForums?.length || 0);
      const resolvedCount = (allForums || []).filter(r => r.status === 'resolved').length;

      const recentReports = (allForums || []).filter(r => r.created_at >= sinceIsoUtc);

      const markers = ((allForums || []).map(r => ({
        lat: r.latitude,
        lng: r.longitude,
        status: r.status,
        title: r.title,
        address: r.address
      }))).filter(m => m.lat && m.lng);

      res.json({
        success: true,
        data: {
          totalReports,
          recentReportsCount: recentReports.length,
          resolvedCount,
          markers
        }
      });
    } catch (error) {
      console.error('getHomeSummary error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  static async getReportsByProvince(req, res) {
    try {
      const { province } = req.params;
      
      if (!province) {
        return res.status(400).json({
          success: false,
          message: 'Province parameter required'
        });
      }

      const { data, error } = await supabaseAdmin
        .from('forums')
        .select(`
          id,
          title,
          description,
          latitude,
          longitude,
          address,
          status,
          priority,
          created_at,
          incident_date,
          users(full_name, email)
        `)
        .ilike('address', `%${province}%`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: data || []
      });

    } catch (error) {
      console.error('Get reports by province error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateReportStatus(req, res) {
    try {
      const { reportId } = req.params;
      const { status, notes } = req.body;
      const userId = req.user.id;
      const userRole = req.user.roles?.name;

      if (!reportId || !status) {
        return res.status(400).json({
          success: false,
          message: 'Report ID and status required'
        });
      }

      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      if (userRole === 'karyawan') {
        
      }

      const { data: currentRow } = await supabaseAdmin
        .from('forums')
        .select('*')
        .eq('id', reportId)
        .single();

      const nowIso = new Date().toISOString();
      const statusTimestamps = {};
      if (status === 'in_progress') statusTimestamps.in_progress_at = nowIso;
      if (status === 'resolved') statusTimestamps.resolved_at = nowIso;
      if (status === 'closed') statusTimestamps.closed_at = nowIso;

      const { data, error } = await supabaseAdmin
        .from('forums')
        .update({
          status,
          updated_at: nowIso,
          ...statusTimestamps
        })
        .eq('id', reportId)
        .select('*')
        .single();

      if (error) throw error;

      if ((status === 'closed' || status === 'resolved') && currentRow) {
        const rowToInsert = {
          user_id: currentRow.user_id,
          title: currentRow.title,
          description: currentRow.description,
          address: currentRow.address,
          latitude: currentRow.latitude,
          longitude: currentRow.longitude,
          priority: currentRow.priority,
          status: status,
          incident_date: currentRow.incident_date,
          created_at: currentRow.created_at,
          updated_at: nowIso
        };
        const { error: insertHistErr } = await supabaseAdmin
          .from('forum_history')
          .insert(rowToInsert);
        if (insertHistErr) {
          console.error('Failed to insert into forum_history:', insertHistErr);
        }
      }

      try {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('full_name')
          .eq('id', userId)
          .single();
        const adminUsername = userData?.full_name || 'Admin';
        const notificationResult = await NotificationService.sendStatusUpdateNotification(reportId, status, adminUsername);
      } catch (notifError) {
        console.error('❌ Failed to send notification:', notifError);
      }

      res.json({
        success: true,
        message: 'Report status updated successfully',
        data
      });

    } catch (error) {
      console.error('Update report status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
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

      const { data: forum, error: forumError } = await supabaseAdmin
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

      if (tags && tags.length > 0) {
        const tagInserts = [];
        
        for (const tagName of tags) {
          const normalizedName = tagName.trim().toLowerCase();
          if (!normalizedName) continue;

          let tagId;
          const { data: existingTag } = await supabaseAdmin
            .from('tags')
            .select('id')
            .eq('name', normalizedName)
            .single();

          if (existingTag) {
            tagId = existingTag.id;
            
            const { data: currentTag } = await supabaseAdmin
              .from('tags')
              .select('usage_count')
              .eq('id', tagId)
              .single();
            
            const newUsageCount = (currentTag?.usage_count || 0) + 1;
            
            await supabaseAdmin
              .from('tags')
              .update({ usage_count: newUsageCount })
              .eq('id', tagId);
          } else {
            const slug = normalizedName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const { data: newTag } = await supabaseAdmin
              .from('tags')
              .insert({
                name: normalizedName,
                slug: slug,
                usage_count: 1
              })
              .select('id')
              .single();
            tagId = newTag?.id;
          }

          if (tagId) {
            tagInserts.push({ forum_id, tag_id: tagId });
          }
        }

        if (tagInserts.length > 0) {
          const { error: tagError } = await supabaseAdmin
            .from('forum_tags')
            .insert(tagInserts);
          
          if (tagError) {
            console.error('❌ Error inserting forum_tags:', tagError);
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
        const { data: mediaData, error: mediaError } = await supabaseAdmin
          .from('forum_media')
          .insert(mediaInserts);

        if (mediaError) {
          console.error('❌ Error inserting forum_media:', mediaError);
        }
      } else {
      }

      try {
        if (req.user?.roles?.name !== 'admin' && req.user?.roles?.name !== 'karyawan') {
          const PointSystem = require('../services/PointSystem');
          const pointResult = await PointSystem.awardPoints(
            req.user.id,
            'post_created',
            null,
            { forumId: forum_id },
            null,
            'Created new forum post'
          );
          if (pointResult.success && pointResult.points > 0) {
            console.log(`Awarded ${pointResult.points} points for forum creation`);
          }
        }
      } catch (pointsError) {
        console.error('❌ Failed to award points:', pointsError);
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
        tags,
        user_id
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = supabaseAdmin
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
          views_count,
          users!forums_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url,
            levels ( name )
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
      if (user_id) query = query.eq('user_id', user_id);
      if (search) {
        query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%, address.ilike.%${search}%`);
        
        if (search.includes('#')) {
          const tagSearch = search.replace(/#/g, '');
          if (tagSearch.trim()) {
            const { data: tagResults } = await supabaseAdmin
              .from('forum_tags')
              .select(`
                forum_id,
                tags!inner(name, slug)
              `)
              .or(`tags.name.ilike.%${tagSearch}%, tags.slug.ilike.%${tagSearch}%`);
            
            if (tagResults && tagResults.length > 0) {
              const forumIds = tagResults.map(tr => tr.forum_id);
              query = query.or(`id.in.(${forumIds.join(',')})`);
            }
          }
        }
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

      const forumsWithCommentCount = await Promise.all(
        (data || []).map(async (forum) => {
          try {
            const { count: commentCount } = await supabaseAdmin
              .from('comments')
              .select('id', { count: 'exact' })
              .eq('forum_id', forum.id)
              .eq('status', 'active')
              .is('deleted_at', null);

            return {
              ...forum,
              comments: commentCount || 0
            };
          } catch (commentError) {
            console.error('Error getting comment count for forum:', forum.id, commentError);
            return {
              ...forum,
              comments: 0
            };
          }
        })
      );

      res.json({
        success: true,
        data: forumsWithCommentCount || [],
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

      const { data, error } = await supabaseAdmin
        .from('forums')
        .select(`
          *,
          users!forums_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url,
            levels ( name )
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

      try {
        await supabaseAdmin
          .from('forums')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', id);
      } catch (viewError) {
        console.error('Failed to increment view count:', viewError);
      }

      const { count: commentCount } = await supabaseAdmin
        .from('comments')
        .select('id', { count: 'exact' })
        .eq('forum_id', id)
        .eq('status', 'active')
        .is('deleted_at', null);

      const forumWithCommentCount = {
        ...data,
        comments: commentCount || 0
      };

      res.json({
        success: true,
        data: forumWithCommentCount
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

  static async getComments(req, res) {
    try {
      const { forumId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { data, error } = await supabaseAdmin
        .from('comments')
        .select(`
          id,
          content,
          is_anonymous,
          upvotes,
          downvotes,
          created_at,
          updated_at,
          users!comments_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url,
            roles (
              id,
              name
            ),
            levels ( name )
          ),
          parent_id
        `)
        .eq('forum_id', forumId)
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (error) {
        console.error('Error getting comments:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to get comments',
          error: error.message
        });
      }

      const nodes = (data || []).map(c => ({ ...c, replies: [] }));
      const map = new Map(nodes.map(n => [n.id, n]));
      for (const n of nodes) {
        if (n.parent_id) {
          const parent = map.get(n.parent_id);
          if (parent) parent.replies.push(n);
        }
      }
      const commentsWithReplies = nodes.filter(n => !n.parent_id);

      res.json({
        success: true,
        data: commentsWithReplies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: commentsWithReplies.length
        }
      });

    } catch (error) {
      console.error('Error in getComments:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async voteComment(req, res) {
    try {
      const { commentId } = req.params;
      const { action } = req.body;
      if (!['upvote', 'downvote', 'remove_upvote', 'remove_downvote'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Invalid action' });
      }

      const { data: currentComment, error: fetchError } = await supabaseAdmin
        .from('comments')
        .select('upvotes, downvotes')
        .eq('id', commentId)
        .single();
      if (fetchError || !currentComment) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      let updateData = {};
      const cu = currentComment.upvotes || 0;
      const cd = currentComment.downvotes || 0;
      if (action === 'upvote') updateData.upvotes = cu + 1;
      if (action === 'downvote') updateData.downvotes = cd + 1;
      if (action === 'remove_upvote') updateData.upvotes = Math.max(0, cu - 1);
      if (action === 'remove_downvote') updateData.downvotes = Math.max(0, cd - 1);

      const { data, error } = await supabaseAdmin
        .from('comments')
        .update(updateData)
        .eq('id', commentId)
        .select('id, upvotes, downvotes')
        .single();
      if (error) {
        return res.status(500).json({ success: false, message: 'Failed to update vote', error: error.message });
      }

      res.json({
        success: true,
        message: `${action} successful`,
        data: { id: data.id, upvotes: data.upvotes, downvotes: data.downvotes }
      });
    } catch (error) {
      console.error('Error in voteComment:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  }

  static async getMentionSuggestions(req, res) {
    try {
      const { forumId } = req.params;
      const { query = '' } = req.query;
      const currentUserId = req.user.id; 
      
      
      
      if (!forumId) {
        return res.status(400).json({
          success: false,
          message: 'Forum ID required'
        });
      }

      const { data: commenters, error: commentersError } = await supabaseAdmin
        .from('comments')
        .select(`
          users!comments_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('forum_id', forumId)
        .not('users.id', 'is', null);

      if (commentersError) {
        console.error('Error fetching commenters:', commentersError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch mention suggestions'
        });
      }

      const uniqueUsers = [];
      const seenUserIds = new Set();
      
      
      
      commenters.forEach(comment => {
        const user = comment.users;
        if (user && !seenUserIds.has(user.id)) {
          seenUserIds.add(user.id);
          
          if (user.id === currentUserId) {
            
            return;
          }
          
          if (!query || 
              user.username?.toLowerCase().includes(query.toLowerCase()) ||
              user.full_name?.toLowerCase().includes(query.toLowerCase())) {
            uniqueUsers.push({
              id: user.id,
              username: user.username,
              full_name: user.full_name,
              avatar_url: user.avatar_url,
              display_name: user.username || user.full_name
            });
          }
        }
      });
      
      

      uniqueUsers.sort((a, b) => {
        const aExact = a.username === query || a.full_name === query;
        const bExact = b.username === query || b.full_name === query;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return a.display_name.localeCompare(b.display_name);
      });

      res.json({
        success: true,
        data: uniqueUsers.slice(0, 10) 
      });

    } catch (error) {
      console.error('Error in getMentionSuggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async createComment(req, res) {
    try {
      const { forumId } = req.params;
      const { content, parent_id, is_anonymous = false } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Comment content is required'
        });
      }

      const { data: forum } = await supabaseAdmin
        .from('forums')
        .select('id')
        .eq('id', forumId)
        .single();

      if (!forum) {
        return res.status(404).json({
          success: false,
          message: 'Forum not found'
        });
      }

      if (parent_id) {
        const { data: parentComment } = await supabaseAdmin
          .from('comments')
          .select('id, parent_id')
          .eq('id', parent_id)
          .single();
        if (parentComment && parentComment.parent_id) {
          return res.status(400).json({
            success: false,
            message: 'Replies to replies are not allowed'
          });
        }
      }

      const { data: comment, error } = await supabaseAdmin
        .from('comments')
        .insert({
          forum_id: forumId,
          user_id: userId,
          parent_id: parent_id || null,
          content: content.trim(),
          is_anonymous
        })
        .select(`
          id,
          content,
          is_anonymous,
          upvotes,
          downvotes,
          created_at,
          users!comments_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create comment',
          error: error.message
        });
      }

      try {
        if (req.user?.roles?.name !== 'admin' && req.user?.roles?.name !== 'karyawan') {
          const PointSystem = require('../services/PointSystem');
          await PointSystem.awardPoints(
            userId,
            'comment_created',
            null,
            { forumId, commentId: comment.id },
            null,
            'Created forum comment'
          );
        }
      } catch (pointsError) {
        console.error('Failed to award points for comment:', pointsError);
      }

      try {
        const { data: commenterData } = await supabaseAdmin
          .from('users')
          .select('username, full_name')
          .eq('id', userId)
          .single();

        if (commenterData) {
          const commenterUsername = commenterData.username || commenterData.full_name || 'Seseorang';
          
          if (parent_id) {
            const { data: parentComment } = await supabaseAdmin
              .from('comments')
              .select(`
                id,
                user_id,
                content,
                users!comments_user_id_fkey (
                  username,
                  full_name
                )
              `)
              .eq('id', parent_id)
              .single();

            if (parentComment && parentComment.user_id !== userId) {
              const parentAuthorName = parentComment.users?.username || parentComment.users?.full_name || 'Seseorang';
              
              await NotificationService.sendCommentNotification(
                forumId,
                parentComment.user_id, 
                commenterUsername,
                content.trim(),
                'reply' 
              );
            }
          } else {
            await NotificationService.sendCommentNotification(
              forumId, 
              userId, 
              commenterUsername, 
              content.trim()
            );
          }

          const mentionedUsernames = NotificationService.parseMentions(content.trim());
          
          if (mentionedUsernames.length > 0) {
            
            await NotificationService.sendMentionNotification(
              forumId,
              userId,
              commenterUsername,
              content.trim(),
              mentionedUsernames
            );
          } else {
            
          }
        }
      } catch (notifError) {
        console.error('Failed to send comment notifications:', notifError);
      }

      res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: comment
      });

    } catch (error) {
      console.error('Error in createComment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async votePost(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const userId = req.user.id;

      if (!['upvote', 'downvote', 'remove_upvote', 'remove_downvote'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be upvote, downvote, remove_upvote, or remove_downvote'
        });
      }

      const { data: currentPost, error: fetchError } = await supabaseAdmin
        .from('forums')
        .select('upvotes, downvotes')
        .eq('id', id)
        .single();

      if (fetchError || !currentPost) {
        return res.status(404).json({
          success: false,
          message: 'Forum post not found'
        });
      }

      let updateData = {};
      let currentUpvotes = currentPost.upvotes || 0;
      let currentDownvotes = currentPost.downvotes || 0;

      switch (action) {
        case 'upvote':
          updateData.upvotes = currentUpvotes + 1;
          break;
        case 'downvote':
          updateData.downvotes = currentDownvotes + 1;
          break;
        case 'remove_upvote':
          updateData.upvotes = Math.max(0, currentUpvotes - 1);
          break;
        case 'remove_downvote':
          updateData.downvotes = Math.max(0, currentDownvotes - 1);
          break;
      }

      const { data, error } = await supabaseAdmin
        .from('forums')
        .update(updateData)
        .eq('id', id)
        .select('id, upvotes, downvotes')
        .single();

      if (error) {
        console.error('Error updating vote:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update vote',
          error: error.message
        });
      }

      if (action === 'upvote') {
        try {
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('username, full_name')
            .eq('id', userId)
            .single();

          if (userData) {
            const displayName = userData.full_name || userData.username || 'Seseorang';
            await NotificationService.sendLikeNotification(id, userId, displayName);
          }
        } catch (notifError) {
          console.error('Error sending like notification:', notifError);
        }
      }

      res.json({
        success: true,
        message: `${action} successful`,
        data: {
          id: data.id,
          upvotes: data.upvotes,
          downvotes: data.downvotes
        }
      });

    } catch (error) {
      console.error('Error in votePost:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async toggleBookmark(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { data: existingBookmark } = await supabaseAdmin
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('forum_id', id)
        .single();

      if (existingBookmark) {
        const { error } = await supabaseAdmin
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) {
          console.error('Error removing bookmark:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to remove bookmark'
          });
        }

        res.json({
          success: true,
          message: 'Bookmark removed',
          bookmarked: false
        });
      } else {
        const { data, error } = await supabaseAdmin
          .from('bookmarks')
          .insert({
            user_id: userId,
            forum_id: id
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error adding bookmark:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to add bookmark'
          });
        }

        res.json({
          success: true,
          message: 'Bookmark added',
          bookmarked: true,
          data: { id: data.id }
        });
      }

    } catch (error) {
      console.error('Error in toggleBookmark:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getUserBookmarks(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { data, error } = await supabaseAdmin
        .from('bookmarks')
        .select(`
          id,
          created_at,
          forums (
            id,
            title,
            description,
            address,
            status,
            priority,
            created_at,
            upvotes,
            downvotes,
            views_count,
            users!forums_user_id_fkey (
              full_name,
              avatar_url,
              levels ( name )
            ),
            forum_media (
              file_url,
              is_primary
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (error) {
        console.error('Error getting bookmarks:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to get bookmarks'
        });
      }

      res.json({
        success: true,
        data: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error in getUserBookmarks:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async checkBookmarkStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { data: existingBookmark, error } = await supabaseAdmin
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('forum_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking bookmark status:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to check bookmark status'
        });
      }

      res.json({
        success: true,
        bookmarked: !!existingBookmark,
        data: {
          bookmarked: !!existingBookmark,
          bookmark_id: existingBookmark?.id || null
        }
      });

    } catch (error) {
      console.error('Error in checkBookmarkStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async updateComment(req, res) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Content is required'
        });
      }

      const { data: existingComment, error: fetchError } = await supabaseAdmin
        .from('comments')
        .select('id, user_id, content')
        .eq('id', commentId)
        .single();

      if (fetchError || !existingComment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      if (existingComment.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own comments'
        });
      }

      const { data: updatedComment, error: updateError } = await supabaseAdmin
        .from('comments')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select('id, content, updated_at')
        .single();

      if (updateError) {
        console.error('Error updating comment:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update comment'
        });
      }

      res.json({
        success: true,
        message: 'Comment updated successfully',
        data: updatedComment
      });

    } catch (error) {
      console.error('Error in updateComment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      
      const { data: existingComment, error: fetchError } = await supabaseAdmin
        .from('comments')
        .select('id, user_id, content')
        .eq('id', commentId)
        .single();

      if (fetchError || !existingComment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      if (existingComment.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own comments'
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('comments')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (deleteError) {
        console.error('Error deleting comment:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete comment'
        });
      }

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });

    } catch (error) {
      console.error('Error in deleteComment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getTrending(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();


      const { data: trendingPosts, error } = await supabaseAdmin
        .from('forums')
        .select(`
          id,
          title,
          description,
          created_at,
          views_count,
          upvotes,
          downvotes,
          users (
            id,
            full_name,
            username,
            avatar_url
          ),
          comments:comments(count)
        `)
        .gte('created_at', sevenDaysAgo)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }


      const postsWithScore = (trendingPosts || []).map(post => {
        const views = post.views_count || 0;
        const comments = post.comments?.[0]?.count || 0;
        const upvotes = post.upvotes || 0;
        
        const trendingScore = (views * 0.6) + (comments * 3 * 0.3) + (upvotes * 0.1);
        
        const isRecent = new Date(post.created_at) >= new Date(threeDaysAgo);
        const finalScore = isRecent ? trendingScore * 1.2 : trendingScore;
        
        return {
          ...post,
          comments: comments,
          trending_score: Math.round(finalScore),
          is_recent: isRecent
        };
      });

      const topTrending = postsWithScore
        .sort((a, b) => b.trending_score - a.trending_score)
        .slice(0, limit);



      res.json({
        success: true,
        data: topTrending,
        metadata: {
          total_posts_checked: trendingPosts?.length || 0,
          trending_returned: topTrending.length,
          date_range: {
            posts_since: sevenDaysAgo,
            recent_boost_since: threeDaysAgo
          }
        }
      });

    } catch (error) {
      console.error('Get trending error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = ForumsController;
