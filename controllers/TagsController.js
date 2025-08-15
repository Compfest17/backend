const { supabaseDb } = require('../config/database');

class TagsController {
  static async searchTags(req, res) {
    try {
      const { q = '', limit = 10 } = req.query;
      
      if (!q.trim()) {
        return res.json({ data: [], count: 0 });
      }

      const { data, error } = await supabaseDb
        .from('tags')
        .select('id, name, usage_count')
        .ilike('name', `%${q.toLowerCase()}%`)
        .order('usage_count', { ascending: false })
        .order('name')
        .limit(parseInt(limit));

      if (error) {
        console.error('Error searching tags:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to search tags',
          error: error.message
        });
      }

      res.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      });
    } catch (error) {
      console.error('Error in searchTags:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getOrCreateTag(req, res) {
    try {
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tag name is required'
        });
      }

      const normalizedName = name.trim().toLowerCase();
      const slug = normalizedName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const { data: existingTag, error: searchError } = await supabaseDb
        .from('tags')
        .select('id, name, usage_count')
        .eq('name', normalizedName)
        .single();

      if (searchError && searchError.code !== 'PGRST116') { 
        console.error('Error checking existing tag:', searchError);
        return res.status(500).json({
          success: false,
          message: 'Failed to check existing tag',
          error: searchError.message
        });
      }

      if (existingTag) {
        return res.json({
          success: true,
          data: existingTag,
          created: false
        });
      }

      const { data: newTag, error: createError } = await supabaseDb
        .from('tags')
        .insert({
          name: normalizedName,
          slug: slug,
          usage_count: 0
        })
        .select('id, name, usage_count')
        .single();

      if (createError) {
        console.error('Error creating tag:', createError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create tag',
          error: createError.message
        });
      }

      res.status(201).json({
        success: true,
        data: newTag,
        created: true
      });
    } catch (error) {
      console.error('Error in getOrCreateTag:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getPopularTags(req, res) {
    try {
      const { limit = 20 } = req.query;

      const { data, error } = await supabaseDb
        .from('tags')
        .select('id, name, usage_count')
        .gt('usage_count', 0)
        .order('usage_count', { ascending: false })
        .order('name')
        .limit(parseInt(limit));

      if (error) {
        console.error('Error getting popular tags:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to get popular tags',
          error: error.message
        });
      }

      res.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      });
    } catch (error) {
      console.error('Error in getPopularTags:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = TagsController;
