require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class NotificationController {
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      
      
      const { data: notifications, error } = await supabaseAdmin
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


      const transformedNotifications = await Promise.all(
        notifications.map(async (notification) => {
          const user = NotificationController.extractUsername(notification.title, notification.message);
          const action = NotificationController.extractAction(notification.message);
          const content = NotificationController.extractContent(notification.message) || notification.forums?.title || '';

          let role = null;
          try {
            const raw = (notification.title || '').trim();
            if (raw) {
              if (raw.startsWith('@')) {
                const key = raw.substring(1);
                if (key) {
                  const { data: byU } = await supabaseAdmin
                    .from('users')
                    .select('id, roles(name)')
                    .eq('username', key)
                    .single();
                  role = byU?.roles?.name || null;
                }
              } else {
                let found = null;
                const { data: byUsername } = await supabaseAdmin
                  .from('users')
                  .select('id, roles(name)')
                  .eq('username', raw)
                  .single();
                if (byUsername) {
                  found = byUsername;
                } else {
                  const { data: byFull } = await supabaseAdmin
                    .from('users')
                    .select('id, roles(name)')
                    .eq('full_name', raw)
                    .single();
                  if (byFull) found = byFull;
                }
                role = found?.roles?.name || null;
              }
            }
          } catch {}

          return {
            id: notification.id,
            type: NotificationController.getNotificationType(notification.type),
            category: 'general',
            user,
            action,
            content,
            time: NotificationController.formatTime(notification.created_at),
            read: notification.is_read,
            avatar: '/image/forum/test/profil-test.jpg',
            forum_id: notification.forum_id,
            role
          };
        })
      );


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

  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { error } = await supabaseAdmin
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

  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const { error } = await supabaseAdmin
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

  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const { count, error } = await supabaseAdmin
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
      'forum_comment': 'comment',
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
    if (title && title.trim().length > 0) {
      return title.trim();
    }
    if (message.includes('Sistem GatotKota')) return 'Sistem GatotKota';
    const actionWords = ['menyukai', 'mengomentari', 'menyebut', 'memperbarui'];
    for (const word of actionWords) {
      if (message.includes(word)) {
        return message.split(word)[0].trim();
      }
    }
    return 'User';
  }

  static extractAction(message) {
    if (message.includes('menyukai')) return 'menyukai postingan Anda';
    if (message.includes('mengomentari')) return 'mengomentari postingan Anda:';
    if (message.includes('membalas')) return 'membalas komentar Anda:';
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
    const created = new Date(createdAt + 'Z');
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}d`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}j`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}h`;

    return `${Math.floor(diffInSeconds / 2592000)}bln`;
  }
}

module.exports = NotificationController;
