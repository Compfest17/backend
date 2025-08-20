const { supabaseAdmin } = require('../config/supabase');
const PointSystem = require('../services/PointSystem');

class PointController {

  static async getPointRules(req, res) {
    try {
      const { data, error } = await supabaseAdmin
        .from('point_rules')
        .select(`
          *,
          created_by_user:created_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching point rules:', error);
        return res.status(500).json({ error: error.message });
      }

      res.json({
        success: true,
        rules: data
      });

    } catch (error) {
      console.error('❌ PointController.getPointRules error:', error);
      res.status(500).json({ error: error.message });
    }
  }


  static async createPointRule(req, res) {
    try {
      const { event_type, event_condition, points, description, is_active = true } = req.body;

      if (!event_type || points === undefined || !description) {
        return res.status(400).json({ 
          error: 'Missing required fields: event_type, points, description' 
        });
      }

      const ruleData = {
        event_type,
        event_condition: event_condition || null,
        points: parseInt(points),
        description,
        is_active,
        created_by: req.user.id
      };

      const { data, error } = await supabaseAdmin
        .from('point_rules')
        .insert([ruleData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating point rule:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Created point rule: ${event_type} = ${points} points`);

      res.json({
        success: true,
        rule: data,
        message: 'Point rule created successfully'
      });

    } catch (error) {
      console.error('❌ PointController.createPointRule error:', error);
      res.status(500).json({ error: error.message });
    }
  }


  static async updatePointRule(req, res) {
    try {
      if (req.user.roles?.name !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { ruleId } = req.params;
      const { event_type, event_condition, points, description, is_active } = req.body;

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (event_type !== undefined) updateData.event_type = event_type;
      if (event_condition !== undefined) updateData.event_condition = event_condition;
      if (points !== undefined) updateData.points = parseInt(points);
      if (description !== undefined) updateData.description = description;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabaseAdmin
        .from('point_rules')
        .update(updateData)
        .eq('id', ruleId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating point rule:', error);
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Point rule not found' });
      }

      console.log(`✅ Updated point rule: ${ruleId}`);

      res.json({
        success: true,
        rule: data,
        message: 'Point rule updated successfully'
      });

    } catch (error) {
      console.error('❌ PointController.updatePointRule error:', error);
      res.status(500).json({ error: error.message });
    }
  }


  static async deletePointRule(req, res) {
    try {
      if (req.user.roles?.name !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { ruleId } = req.params;

      const { error } = await supabaseAdmin
        .from('point_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        console.error('❌ Error deleting point rule:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Deleted point rule: ${ruleId}`);

      res.json({
        success: true,
        message: 'Point rule deleted successfully'
      });

    } catch (error) {
      console.error('❌ PointController.deletePointRule error:', error);
      res.status(500).json({ error: error.message });
    }
  }


  static async manualAdjustment(req, res) {
    try {
      console.log('🔍 Manual adjustment request:', {
        user: req.user,
        userRole: req.user?.roles?.name,
        body: req.body
      });
      
      const { username, points, reason } = req.body;

      if (!username || points === undefined || !reason) {
        return res.status(400).json({ 
          error: 'Missing required fields: username, points, reason' 
        });
      }

      const { data: targetUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, full_name, current_points, username')
        .eq('username', username)
        .single();

      if (userError || !targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const result = await PointSystem.manualAdjustment(
        req.user.id,
        targetUser.id,
        parseInt(points),
        reason
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        success: true,
        adjustment: result,
        user: {
          id: targetUser.id,
          username: targetUser.username,
          name: targetUser.full_name,
          previousPoints: targetUser.current_points,
          newPoints: result.totalPoints
        },
        message: `Successfully ${points > 0 ? 'awarded' : 'deducted'} ${Math.abs(points)} points`
      });

    } catch (error) {
      console.error('❌ PointController.manualAdjustment error:', error);
      res.status(500).json({ error: error.message });
    }
  }


  static async getUserPointHistory(req, res) {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      if (req.user.roles?.name !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await PointSystem.getUserPointHistory(userId, limit);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        success: true,
        history: result.history,
        message: `Retrieved ${result.history.length} point transactions`
      });

    } catch (error) {
      console.error('❌ PointController.getUserPointHistory error:', error);
      res.status(500).json({ error: error.message });
    }
  }


  static async getPointStatistics(req, res) {
    try {
      if (req.user.roles?.name !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { data: totalPoints, error: totalError } = await supabaseAdmin
        .from('point_transactions')
        .select('points');

      if (totalError) {
        console.error('❌ Error fetching point statistics:', totalError);
        return res.status(500).json({ error: totalError.message });
      }

      const totalDistributed = totalPoints.reduce((sum, transaction) => sum + transaction.points, 0);

      const { data: eventStats, error: eventError } = await supabaseAdmin
        .from('point_transactions')
        .select('event_type, points');

      if (eventError) {
        console.error('❌ Error fetching event statistics:', eventError);
        return res.status(500).json({ error: eventError.message });
      }

      const eventBreakdown = eventStats.reduce((acc, transaction) => {
        acc[transaction.event_type] = (acc[transaction.event_type] || 0) + transaction.points;
        return acc;
      }, {});

      const { data: topUsers, error: topError } = await supabaseAdmin
        .from('users')
        .select('id, full_name, current_points')
        .order('current_points', { ascending: false })
        .limit(10);

      if (topError) {
        console.error('❌ Error fetching top users:', topError);
        return res.status(500).json({ error: topError.message });
      }

      res.json({
        success: true,
        statistics: {
          totalPointsDistributed: totalDistributed,
          totalTransactions: totalPoints.length,
          eventBreakdown,
          topUsers
        }
      });

    } catch (error) {
      console.error('❌ PointController.getPointStatistics error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PointController;
