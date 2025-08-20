const { supabaseAdmin } = require('../config/supabase');

class PointSystem {

  static async awardPoints(userId, eventType, eventCondition = null, relatedIds = {}, awardedBy = null, customDescription = null) {
    try {
      console.log(`🎯 PointSystem: Processing ${eventType} for user ${userId}`);
      
      let query = supabaseAdmin
        .from('point_rules')
        .select('*')
        .eq('event_type', eventType)
        .eq('is_active', true);

      if (eventCondition) {
        query = query.eq('event_condition', eventCondition);
      } else {
        query = query.is('event_condition', null);
      }

      const { data: rules, error: ruleError } = await query;

      if (ruleError) {
        console.error('❌ Error fetching point rules:', ruleError);
        return { success: false, error: ruleError.message };
      }

      if (!rules || rules.length === 0) {
        console.log(`ℹ️  No active rule found for ${eventType} with condition: ${eventCondition}`);
        return { success: true, points: 0, message: 'No rule applies' };
      }

      const rule = rules[0];
      const pointsToAward = rule.points;

      if (pointsToAward === 0) {
        console.log(`ℹ️  Rule found but awards 0 points for ${eventType}`);
        return { success: true, points: 0, message: 'Rule awards 0 points' };
      }

      const transactionData = {
        user_id: userId,
        points: pointsToAward,
        event_type: eventType,
        event_condition: eventCondition,
        related_forum_id: relatedIds.forumId || null,
        related_comment_id: relatedIds.commentId || null,
        related_reaction_id: relatedIds.reactionId || null,
        description: customDescription || rule.description,
        awarded_by: awardedBy,
        rule_id: rule.id
      };

      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from('point_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (transactionError) {
        console.error('❌ Error recording point transaction:', transactionError);
        return { success: false, error: transactionError.message };
      }

      const { data: currentUser, error: getCurrentError } = await supabaseAdmin
        .from('users')
        .select('current_points')
        .eq('id', userId)
        .single();

      if (getCurrentError) {
        console.error('❌ Error getting current user points:', getCurrentError);
        return { success: false, error: getCurrentError.message };
      }

      const currentPoints = currentUser.current_points || 0;
      const newPoints = currentPoints + pointsToAward;

      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          current_points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, current_points, level_id')
        .single();

      if (updateError) {
        console.error('❌ Error updating user points:', updateError);
        return { success: false, error: updateError.message };
      }

      await this.checkAndUpdateUserLevel(userId, updatedUser.current_points);

      await this.sendPointNotification(userId, pointsToAward, rule.description);

      console.log(`✅ Awarded ${pointsToAward} points to user ${userId} for ${eventType}`);

      return {
        success: true,
        points: pointsToAward,
        totalPoints: updatedUser.current_points,
        transactionId: transaction.id,
        message: `Awarded ${pointsToAward} points for ${rule.description}`
      };

    } catch (error) {
      console.error('❌ PointSystem.awardPoints error:', error);
      return { success: false, error: error.message };
    }
  }


  static async manualAdjustment(adminId, userId, points, reason) {
    try {
      console.log(`🔧 Manual point adjustment: ${points} points for user ${userId} by admin ${adminId}`);

      const transactionData = {
        user_id: userId,
        points: points,
        event_type: 'manual_adjustment',
        event_condition: null,
        related_forum_id: null,
        related_comment_id: null,
        related_reaction_id: null,
        description: `Manual adjustment: ${reason}`,
        awarded_by: adminId,
        rule_id: null
      };

      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from('point_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (transactionError) {
        console.error('❌ Error recording manual adjustment:', transactionError);
        return { success: false, error: transactionError.message };
      }

      const { data: currentUser, error: getCurrentError } = await supabaseAdmin
        .from('users')
        .select('current_points')
        .eq('id', userId)
        .single();

      if (getCurrentError) {
        console.error('❌ Error getting current user points:', getCurrentError);
        return { success: false, error: getCurrentError.message };
      }

      const currentPoints = currentUser.current_points || 0;
      const newPoints = currentPoints + points;

      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          current_points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, current_points, level_id')
        .single();

      if (updateError) {
        console.error('❌ Error updating user points:', updateError);
        return { success: false, error: updateError.message };
      }

      await this.checkAndUpdateUserLevel(userId, updatedUser.current_points);

      const message = points > 0 ? 
        `You received ${points} points: ${reason}` : 
        `${Math.abs(points)} points were deducted: ${reason}`;
      
      await this.sendPointNotification(userId, points, message);

      console.log(`✅ Manual adjustment complete: ${points} points for user ${userId}`);

      return {
        success: true,
        points: points,
        totalPoints: updatedUser.current_points,
        transactionId: transaction.id,
        message: `Manual adjustment: ${points} points`
      };

    } catch (error) {
      console.error('❌ PointSystem.manualAdjustment error:', error);
      return { success: false, error: error.message };
    }
  }


  static async checkAndUpdateUserLevel(userId, currentPoints) {
    try {
      const { data: level, error: levelError } = await supabaseAdmin
        .from('levels')
        .select('*')
        .lte('min_points', currentPoints)
        .order('min_points', { ascending: false })
        .limit(1)
        .single();

      if (levelError || !level) {
        console.log('ℹ️  No level found for points:', currentPoints);
        return;
      }

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ level_id: level.id })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating user level:', updateError);
      } else {
        console.log(`📈 Updated user ${userId} to level: ${level.name}`);
      }

    } catch (error) {
      console.error('❌ Error checking user level:', error);
    }
  }


  static async sendPointNotification(userId, points, description) {
    try {
      const notificationData = {
        user_id: userId,
        title: points > 0 ? `You earned ${points} points! 🎉` : `Points deducted: ${Math.abs(points)} 📉`,
        message: description,
        type: 'points',
        is_read: false
      };

      await supabaseAdmin
        .from('notifications')
        .insert([notificationData]);

      console.log(`📢 Point notification sent to user ${userId}`);

    } catch (error) {
      console.error('❌ Error sending point notification:', error);
    }
  }


  static async getUserPointHistory(userId, limit = 50) {
    try {
      const { data, error } = await supabaseAdmin
        .from('point_transactions')
        .select(`
          *,
          awarded_by_user:awarded_by(full_name),
          rule:point_rules(description),
          related_forum:forums(title),
          related_comment:comments(content)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching point history:', error);
        return { success: false, error: error.message };
      }

      return { success: true, history: data };

    } catch (error) {
      console.error('❌ PointSystem.getUserPointHistory error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PointSystem;
