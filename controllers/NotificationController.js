require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class NotificationController {
  /**
   * Get all notifications for authenticated user
   */
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select(`
          id,
          title,
          message,
          type,
          is_read,
          created_at,
          read_at,
          forum_id,
          forums!left (
            id,
            title,
            description
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
          success: false,
          message: 'Gagal mengambil notifikasi',
          error: error.message
        });
      }

      const transformedNotifications = notifications.map(notification => ({
        id: notification.id,
        type: this.getNotificationType(notification.type),
        category: 'general',
        user: this.extractUsername(notification.title, notification.message),
        action: this.extractAction(notification.message),
        content: notification.forums?.title || this.extractContent(notification.message),
        time: this.formatTime(notification.created_at),
        read: notification.is_read,
        avatar: '/image/forum/test/profil-test.jpg',
        forum_id: notification.forum_id
      }));

      return res.status(200).json({
        success: true,
        data: transformedNotifications,
        meta: {
          total: notifications.length,
          unread_count: notifications.filter(n => !n.is_read).length
        }
      });

    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Gagal menandai notifikasi sebagai dibaca',
          error: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notifikasi berhasil ditandai sebagai dibaca'
      });

    } catch (error) {
      console.error('Error in markAsRead:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Gagal menandai semua notifikasi sebagai dibaca',
          error: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Semua notifikasi berhasil ditandai sebagai dibaca'
      });

    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Gagal mengambil jumlah notifikasi belum dibaca',
          error: error.message
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          unread_count: count || 0
        }
      });

    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }

  static getNotificationType(dbType) {
    const typeMap = {
      'forum_update': 'system',
      'comment_reply': 'comment', 
      'status_change': 'system',
      'system': 'system',
      'mention': 'mention',
      'like': 'like',
      'upvote': 'like'
    };
    return typeMap[dbType] || 'system';
  }

  static extractUsername(title, message) {
    if (title.includes('Sistem GatotKota')) return 'Sistem GatotKota';
    if (title.includes('Dinas')) return title.split(' ')[0] + ' ' + title.split(' ')[1];
    
    const mentionMatch = message.match(/@(\w+)/);
    if (mentionMatch) return `@${mentionMatch[1]}`;
    
    const actionWords = ['menyukai', 'mengomentari', 'menyebut', 'memperbarui'];
    for (const word of actionWords) {
      if (message.includes(word)) {
        return message.split(word)[0].trim();
      }
    }
    
    return title.split(' ')[0] || 'User';
  }

  static extractAction(message) {
    if (message.includes('menyukai')) return 'menyukai laporan Anda';
    if (message.includes('mengomentari')) return 'mengomentari laporan Anda';
    if (message.includes('menyebut')) return 'menyebut Anda dalam komentar:';
    if (message.includes('diverifikasi')) return 'Laporan Anda telah diverifikasi oleh admin dan sedang dalam proses penanganan.';
    if (message.includes('Selesai')) return 'memperbarui status laporan Anda menjadi "Selesai".';
    
    return message;
  }

  static extractContent(message) {
    const quoteMatch = message.match(/"([^"]*)"/);
    if (quoteMatch) return quoteMatch[1];
    
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  }

  static formatTime(createdAt) {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}d`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}j`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}h`;
    
    return `${Math.floor(diffInSeconds / 2592000)}bln`;
  }
}

module.exports = NotificationController;
