require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

class NotificationService {

  static async createNotification(data) {
    try {
      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: data.userId,
          forum_id: data.forumId,
          title: data.title,
          message: data.message,
          type: data.type,
          is_read: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      
      return notification;

    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }


  static async sendLikeNotification(forumId, likerUserId, likerUsername) {
    try {
      
      
      const { data: forum, error } = await supabaseAdmin
        .from('forums')
        .select('user_id, title')
        .eq('id', forumId)
        .single();

      if (error || !forum || forum.user_id === likerUserId) {
        
        return;
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: existingNotif } = await supabaseAdmin
        .from('notifications')
        .select('id, message')
        .eq('user_id', forum.user_id)
        .eq('forum_id', forumId)
        .eq('type', 'forum_comment')
        .eq('title', likerUsername)
        .gte('created_at', oneHourAgo)
        .single();

      if (existingNotif) {
        
        const currentMessage = existingNotif.message;
        let newMessage;
        
        if (currentMessage.includes('dan') && currentMessage.includes('lainnya')) {
          const countMatch = currentMessage.match(/(\d+) lainnya/);
          if (countMatch) {
            const count = parseInt(countMatch[1]) + 1;
            newMessage = `${likerUsername} dan ${count} lainnya menyukai laporan Anda`;
          } else {
            newMessage = `${likerUsername} dan 2 lainnya menyukai laporan Anda`;
          }
        } else {
          newMessage = `${likerUsername} dan 1 lainnya menyukai laporan Anda`;
        }

        await supabaseAdmin
          .from('notifications')
          .update({
            title: `${likerUsername} dan lainnya`,
            message: newMessage,
            is_read: false,
            created_at: new Date().toISOString()
          })
          .eq('id', existingNotif.id);

      } else {
        
        await this.createNotification({
          userId: forum.user_id,
          forumId: forumId,
          title: likerUsername,
          message: `${likerUsername} menyukai laporan Anda`,
          type: 'forum_comment'
        });
      }

    } catch (error) {
      console.error('Error sending like notification:', error);
    }
  }

  static async sendCommentNotification(forumId, commenterUserId, commenterUsername, commentContent, notificationType = 'comment') {
    try {
      
      
      if (notificationType === 'reply') {
        const { data: actor } = await supabaseAdmin
          .from('users')
          .select('username, full_name')
          .eq('id', commenterUserId)
          .single();
        const actorTitle = actor?.username ? `@${actor.username}` : (actor?.full_name || commenterUsername);
        const notificationData = {
          userId: commenterUserId, 
          forumId: forumId,
          title: actorTitle,
          message: `${commenterUsername} membalas komentar Anda: "${commentContent.substring(0, 50)}..."`,
          type: 'forum_comment'
        };

        
        const result = await this.createNotification(notificationData);
        return result;
      } else {
        const { data: forum, error } = await supabaseAdmin
          .from('forums')
          .select('user_id, title')
          .eq('id', forumId)
          .single();

        

        if (error || !forum || forum.user_id === commenterUserId) {
          
          return;
        }

        const { data: commenterRow } = await supabaseAdmin
          .from('users')
          .select('username, full_name')
          .eq('id', commenterUserId)
          .single();
        const actorTitle = commenterRow?.username ? `@${commenterRow.username}` : (commenterRow?.full_name || commenterUsername);
        const notificationData = {
          userId: forum.user_id,
          forumId: forumId,
          title: actorTitle,
          message: `${commenterUsername} mengomentari postingan Anda: "${commentContent.substring(0, 50)}..."`,
          type: 'forum_comment'
        };

        
        const result = await this.createNotification(notificationData);
        return result;
      }

    } catch (error) {
      console.error('Error sending comment notification:', error);
    }
  }

  static async sendMentionNotification(forumId, mentionerUserId, mentionerUsername, commentContent, mentionedUsernames) {
    try {
      
      
      const { data: mentioner } = await supabaseAdmin
        .from('users')
        .select('username, full_name')
        .eq('id', mentionerUserId)
        .single();
      const mentionerTitle = mentioner?.username ? `@${mentioner.username}` : (mentioner?.full_name || `@${mentionerUsername}`);

      for (const mention of mentionedUsernames) {
        
        
        let { data: user } = await supabaseAdmin
          .from('users')
          .select('id, username, full_name')
          .eq('username', mention)
          .single();

        if (!user) {
          
          const { data: userByName } = await supabaseAdmin
            .from('users')
            .select('id, username, full_name')
            .ilike('full_name', `%${mention}%`)
            .single();
          
          if (userByName) {
            user = userByName;
            
          }
        }

        if (!user || user.id === mentionerUserId) {
          
          continue;
        }

        const notificationData = {
          userId: user.id,
          forumId: forumId,
          title: mentionerTitle,
          message: `@${mentionerUsername} menyebut Anda dalam komentar: "${commentContent.substring(0, 50)}..."`,
          type: 'forum_comment'
        };

        
        const result = await this.createNotification(notificationData);
      }

    } catch (error) {
      console.error('Error sending mention notification:', error);
    }
  }

  static async sendStatusUpdateNotification(forumId, newStatus, adminUsername = 'Admin') {
    try {
      
      
      const { data: forum, error } = await supabaseAdmin
        .from('forums')
        .select('user_id, title')
        .eq('id', forumId)
        .single();

      
      
      if (error || !forum) {
        
        return;
      }

      let message = '';
      let title = '';

      switch (newStatus) {
        case 'in_progress':
          title = 'Sistem GatotKota';
          message = 'Laporan Anda sedang dalam proses penanganan oleh petugas.';
          break;
        case 'resolved':
          title = 'Sistem GatotKota';
          message = 'Laporan Anda telah berhasil diselesaikan oleh petugas.';
          break;
        case 'closed':
          title = 'Sistem GatotKota';
          message = 'Laporan Anda telah ditutup oleh petugas dan tidak akan ditindaklanjuti lebih lanjut.';
          break;
        case 'rejected':
          title = 'Sistem GatotKota';
          message = 'Laporan Anda telah ditinjau dan tidak memenuhi kriteria untuk ditindaklanjuti.';
          break;
        default:
          title = 'Sistem GatotKota';
          message = `Status laporan Anda telah diperbarui menjadi "${newStatus}" oleh petugas.`;
      }
      
      const notificationResult = await this.createNotification({
        userId: forum.user_id,
        forumId: forumId,
        title: title,
        message: message,
        type: 'status_change'
      });
      

    } catch (error) {
      console.error('Error sending status update notification:', error);
    }
  }
  
  static async sendSystemNotification(userId, title, message, forumId = null) {
    try {
      await this.createNotification({
        userId: userId,
        forumId: forumId,
        title: title,
        message: message,
        type: 'system'
      });

    } catch (error) {
      console.error('Error sending system notification:', error);
    }
  }

  static async sendLevelUpNotification(userId, newLevelName, newLevelPoints) {
    try {
      
      
      const notificationData = {
        userId: userId,
        forumId: null,
        title: '🎉 Level Up!',
        message: `Selamat! Anda telah naik ke level "${newLevelName}" dengan ${newLevelPoints} poin!`,
        type: 'level_up'
      };

      
      const result = await this.createNotification(notificationData);
      
      return result;

    } catch (error) {
      console.error('Error sending level up notification:', error);
      return null;
    }
  }


  static parseMentions(content) {
    const mentionRegex = /@([a-zA-Z0-9_\u00C0-\u017F]+)(?:\s|$)/g;
    const mentions = [];
    let match;
    
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const mention = match[1].trim();
      if (mention.length > 0) {
        mentions.push(mention);
      }
    }
    
    const uniqueMentions = [...new Set(mentions)];
    
    return uniqueMentions;
  }


  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo);

      if (error) {
        console.error('Error cleaning up old notifications:', error);
      } else {
        
      }

    } catch (error) {
      console.error('Error in cleanupOldNotifications:', error);
    }
  }
}

module.exports = NotificationService;
