const { supabaseAdmin } = require('../config/supabase');

class Level {
  static async getAll() {
    const { data, error } = await supabaseAdmin
      .from('levels')
      .select('*')
      .order('points');

    if (error) throw error;
    return data;
  }

  static async findByName(name) {
    const { data, error } = await supabaseAdmin
      .from('levels')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('levels')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async getDefault() {
    let level = await this.findByName('Level Gundala');
    
    if (!level) {
      level = await this.create({
        name: 'Level Gundala',
        points: 0,
        description: 'Level pemula - Gundala'
      });
    }

    return level;
  }

  static async findByPoints(points) {
    const { data, error } = await supabaseAdmin
      .from('levels')
      .select('*')
      .lte('points', points)
      .order('points', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async getNextLevel(currentPoints) {
    const { data, error } = await supabaseAdmin
      .from('levels')
      .select('*')
      .gt('points', currentPoints)
      .order('points', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return null; 
    }

    return data;
  }

  static async create(levelData) {
    const { data, error } = await supabaseAdmin
      .from('levels')
      .insert(levelData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async ensureDefaultLevels() {
    const defaultLevels = [
      { name: 'Level Gundala', points: 0, description: 'Level pemula - Gundala' },
      { name: 'Level GatotKaca', points: 100, description: 'Level menengah - GatotKaca' },
      { name: 'Level SriAsih', points: 250, description: 'Level mahir - SriAsih' },
      { name: 'Level Godam', points: 500, description: 'Level expert - Godam' },
      { name: 'Level Aquanus', points: 1000, description: 'Level master - Aquanus' }
    ];

    const existingLevels = await this.getAll();
    const existingLevelNames = existingLevels.map(l => l.name);

    const levelsToCreate = defaultLevels.filter(
      level => !existingLevelNames.includes(level.name)
    );

    if (levelsToCreate.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('levels')
        .insert(levelsToCreate)
        .select('*');

      if (error) throw error;
      return data;
    }

    return [];
  }

  static async getProgress(userPoints) {
    const currentLevel = await this.findByPoints(userPoints);
    const nextLevel = await this.getNextLevel(userPoints);

    if (!currentLevel) {
      return {
        current: null,
        next: nextLevel,
        progress: 0,
        pointsToNext: nextLevel ? nextLevel.points : 0
      };
    }

    if (!nextLevel) {
      return {
        current: currentLevel,
        next: null,
        progress: 100,
        pointsToNext: 0
      };
    }

    const pointsInCurrentLevel = userPoints - currentLevel.points;
    const pointsNeededForNext = nextLevel.points - currentLevel.points;
    const progress = Math.round((pointsInCurrentLevel / pointsNeededForNext) * 100);

    return {
      current: currentLevel,
      next: nextLevel,
      progress,
      pointsToNext: nextLevel.points - userPoints
    };
  }
}

module.exports = Level;
