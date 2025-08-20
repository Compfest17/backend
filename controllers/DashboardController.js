const { supabaseAdmin } = require('../config/supabase');

class DashboardController {
  static async getSystemOverview(req, res) {
    try {
      const [
        usersStats,
        employeesStats,
        postsStats,
        commentsStats,
        pointsStats,
        recentActivity
      ] = await Promise.all([
        supabaseAdmin
          .from('users')
          .select('role_id, roles(name)')
          .is('deleted_at', null),
          
        supabaseAdmin
          .from('users')
          .select('assigned_province, roles!inner(name)')
          .eq('roles.name', 'karyawan')
          .is('deleted_at', null),
          
        supabaseAdmin
          .from('forums')
          .select('status, priority, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          
        supabaseAdmin
          .from('comments')
          .select('created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          
        supabaseAdmin
          .from('users')
          .select('current_points')
          .not('current_points', 'is', null),
          
        supabaseAdmin
          .from('forums')
          .select('id, title, status, created_at, users(full_name)')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const totalUsers = usersStats.data?.length || 0;
      const usersByRole = {};
      usersStats.data?.forEach(user => {
        const roleName = user.roles?.name || 'unknown';
        usersByRole[roleName] = (usersByRole[roleName] || 0) + 1;
      });

      const totalEmployees = employeesStats.data?.length || 0;
      const activeEmployees = totalEmployees;
      const assignedEmployees = employeesStats.data?.filter(emp => emp.assigned_province).length || 0;
      const unassignedEmployees = totalEmployees - assignedEmployees;

      const totalPosts = postsStats.data?.length || 0;
      const postsByStatus = {};
      const postsByPriority = {};
      postsStats.data?.forEach(post => {
        const status = post.status || 'open';
        const priority = post.priority || 'medium';
        postsByStatus[status] = (postsByStatus[status] || 0) + 1;
        postsByPriority[priority] = (postsByPriority[priority] || 0) + 1;
      });

      const totalComments = commentsStats.data?.length || 0;

      const usersWithPoints = pointsStats.data?.filter(user => user.current_points > 0) || [];
      const totalPoints = usersWithPoints.reduce((sum, user) => sum + (user.current_points || 0), 0) || 0;
      const avgPoints = usersWithPoints.length > 0 ? Math.round(totalPoints / usersWithPoints.length) : 0;

      const systemStats = {
        users: {
          total: totalUsers,
          breakdown: usersByRole,
          newThisMonth: usersStats.data?.filter(u => 
            new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length || 0
        },
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          assigned: assignedEmployees,
          unassigned: unassignedEmployees,
          assignmentRate: totalEmployees > 0 ? Math.round((assignedEmployees / totalEmployees) * 100) : 0
        },
        posts: {
          total: totalPosts,
          byStatus: {
            open: postsByStatus.open || 0,
            in_progress: postsByStatus.in_progress || 0,
            resolved: postsByStatus.resolved || 0
          },
          byPriority: {
            high: postsByPriority.high || 0,
            medium: postsByPriority.medium || 0,
            low: postsByPriority.low || 0
          }
        },
        engagement: {
          totalComments: totalComments,
          totalPoints: totalPoints,
          avgPointsPerUser: avgPoints,
          usersWithPoints: usersWithPoints.length,
          recentActivity: recentActivity.data || []
        }
      };

      res.json({
        success: true,
        data: systemStats
      });

    } catch (error) {
      console.error('System overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil statistik sistem',
        error: error.message
      });
    }
  }

  static async getEmployeeCodes(req, res) {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_verification_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const stats = {
        total: data.length,
        active: 0,
        used: 0,
        expired: 0
      };

      data.forEach(code => {
        if (code.used_at) {
          stats.used++;
        } else if (new Date(code.expires_at) < now) {
          stats.expired++;
        } else {
          stats.active++;
        }
      });

      res.json({
        success: true,
        data: {
          codes: data,
          stats: stats
        }
      });

    } catch (error) {
      console.error('Employee codes error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data kode karyawan',
        error: error.message
      });
    }
  }
}

module.exports = DashboardController;
