require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class NotificationService {

  static async createNotification(data) {
    try {
      const { data: notification, error } = await supabase
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

      console.log(`📢 Notification created: ${data.type} for user ${data.userId}`);
      return notification;

    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }


  static async sendLikeNotification(forumId, likerUserId, likerUsername) {
    try {
      const { data: forum, error } = await supabase
        .from('forums')
        .select('user_id, title')
        .eq('id', forumId)
        .single();

      if (error || !forum || forum.user_id === likerUserId) {
        return;
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id, message')
        .eq('user_id', forum.user_id)
        .eq('forum_id', forumId)
        .eq('type', 'like')
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

        await supabase
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
          type: 'like'
        });
      }

    } catch (error) {
      console.error('Error sending like notification:', error);
    }
  }

  static async sendCommentNotification(forumId, commenterUserId, commenterUsername, commentContent) {
    try {
      const { data: forum, error } = await supabase
        .from('forums')
        .select('user_id, title')
        .eq('id', forumId)
        .single();

      if (error || !forum || forum.user_id === commenterUserId) {
        return;
      }

      await this.createNotification({
        userId: forum.user_id,
        forumId: forumId,
        title: commenterUsername,
        message: `${commenterUsername} mengomentari laporan Anda`,
        type: 'comment_reply'
      });

    } catch (error) {
      console.error('Error sending comment notification:', error);
    }
  }

  static async sendMentionNotification(forumId, mentionerUserId, mentionerUsername, commentContent, mentionedUsernames) {
    try {
      for (const username of mentionedUsernames) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();

        if (!user || user.id === mentionerUserId) continue;

        await this.createNotification({
          userId: user.id,
          forumId: forumId,
          title: `@${mentionerUsername}`,
          message: `@${mentionerUsername} menyebut Anda dalam komentar: "${commentContent.substring(0, 50)}..."`,
          type: 'mention'
        });
      }

    } catch (error) {
      console.error('Error sending mention notification:', error);
    }
  }

  static async sendStatusUpdateNotification(forumId, newStatus, adminUsername = 'Admin') {
    try {
      const { data: forum, error } = await supabase
        .from('forums')
        .select('user_id, title')
        .eq('id', forumId)
        .single();

      if (error || !forum) return;

      let message = '';
      let title = '';

      switch (newStatus) {
        case 'in_progress':
          title = 'Sistem GatotKota';
          message = 'Laporan Anda telah diverifikasi oleh admin dan sedang dalam proses penanganan.';
          break;
        case 'closed':
          title = 'Dinas Pekerjaan Umum';
          message = 'Laporan Anda berhasil menjadi "Selesai".';
          break;
        case 'rejected':
          title = 'Sistem GatotKota';
          message = 'Laporan Anda telah ditinjau dan tidak memenuhi kriteria untuk ditindaklanjuti.';
          break;
        default:
          title = adminUsername;
          message = `Status laporan Anda telah diperbarui menjadi "${newStatus}".`;
      }

      await this.createNotification({
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


  static parseMentions(content) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)];
  }


  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo);

      if (error) {
        console.error('Error cleaning up old notifications:', error);
      } else {
        console.log('📢 Old notifications cleaned up successfully');
      }

    } catch (error) {
      console.error('Error in cleanupOldNotifications:', error);
    }
  }
}

module.exports = NotificationService;
