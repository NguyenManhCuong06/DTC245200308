const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'gallery_db',
  charset: 'utf8mb4_unicode_ci'
};

function resolveDemoPassword(environmentVariable) {
  if (process.env[environmentVariable]) {
    return process.env[environmentVariable];
  }

  const password = crypto.randomBytes(32).toString('base64url');
  console.log(`Generated ${environmentVariable}: ${password}`);
  return password;
}

const DEMO_ADMIN_PASSWORD = resolveDemoPassword('DEMO_ADMIN_PASSWORD');
const DEMO_USER_PASSWORD = resolveDemoPassword('DEMO_USER_PASSWORD');

const DEMO_USERS = [
  { username: 'admin', email: 'admin@gallery.demo', password: DEMO_ADMIN_PASSWORD, role: 'admin' },
  { username: 'demo_user', email: 'user1@gallery.demo', password: DEMO_USER_PASSWORD, role: 'user' },
  { username: 'photo_lover', email: 'user2@gallery.demo', password: DEMO_USER_PASSWORD, role: 'user' }
];

const DEMO_ALBUMS = [
  { title: 'Nature & Landscapes', description: 'Beautiful nature photography from around the world', userIndex: 1, isPublic: true },
  { title: 'Urban Architecture', description: 'Modern and classical architecture photography', userIndex: 1, isPublic: true },
  { title: 'Portrait Sessions', description: 'Professional portrait photography collection', userIndex: 2, isPublic: true },
  { title: 'Street Photography', description: 'Candid moments from city streets', userIndex: 2, isPublic: false },
  { title: 'Macro & Details', description: 'Close-up photography revealing tiny worlds', userIndex: 1, isPublic: true }
];

const DEMO_TAGS = [
  'nature', 'landscape', 'mountain', 'forest', 'ocean', 'sunset', 'sunrise',
  'architecture', 'building', 'cityscape', 'modern', 'classical', 'interior',
  'portrait', 'people', 'studio', 'outdoor', 'candid', 'black-white',
  'street', 'urban', 'night', 'light', 'shadow', 'reflection',
  'macro', 'closeup', 'texture', 'detail', 'abstract', 'pattern'
];

const DEMO_PHOTOS = [
  { title: 'Mountain Peak at Dawn', description: 'Majestic mountain silhouette against sunrise', filename: 'mountain-dawn.jpg', albumIndex: 0, tags: ['nature', 'landscape', 'mountain', 'sunrise'] },
  { title: 'Misty Forest Path', description: 'Ancient forest shrouded in morning mist', filename: 'forest-mist.jpg', albumIndex: 0, tags: ['nature', 'forest', 'mist', 'landscape'] },
  { title: 'Ocean Waves Crashing', description: 'Powerful waves against rocky coastline', filename: 'ocean-waves.jpg', albumIndex: 0, tags: ['nature', 'ocean', 'waves', 'coast'] },
  { title: 'Golden Hour Meadow', description: 'Wildflowers glowing in golden sunset light', filename: 'meadow-sunset.jpg', albumIndex: 0, tags: ['nature', 'landscape', 'sunset', 'flowers'] },
  { title: 'Snow-Covered Peaks', description: 'Alpine mountains blanketed in fresh snow', filename: 'snow-mountains.jpg', albumIndex: 0, tags: ['nature', 'mountain', 'snow', 'winter'] },
  
  { title: 'Modern Glass Facade', description: 'Reflective glass skyscraper in downtown', filename: 'glass-building.jpg', albumIndex: 1, tags: ['architecture', 'modern', 'building', 'glass', 'reflection'] },
  { title: 'Classical Cathedral Interior', description: 'Ornate gothic cathedral with stained glass', filename: 'cathedral-interior.jpg', albumIndex: 1, tags: ['architecture', 'classical', 'interior', 'cathedral'] },
  { title: 'Urban Skyline at Night', description: 'City lights painting the night sky', filename: 'city-night.jpg', albumIndex: 1, tags: ['architecture', 'cityscape', 'night', 'urban', 'lights'] },
  { title: 'Minimalist Bridge Design', description: 'Clean lines of a modern pedestrian bridge', filename: 'bridge-design.jpg', albumIndex: 1, tags: ['architecture', 'modern', 'bridge', 'minimalist'] },
  { title: 'Historic Building Facade', description: 'Weathered stone facade of heritage building', filename: 'historic-facade.jpg', albumIndex: 1, tags: ['architecture', 'classical', 'building', 'historic'] },
  
  { title: 'Studio Portrait Session', description: 'Professional portrait with studio lighting', filename: 'studio-portrait.jpg', albumIndex: 2, tags: ['portrait', 'people', 'studio', 'lighting'] },
  { title: 'Outdoor Natural Light Portrait', description: 'Soft natural light portrait in park', filename: 'outdoor-portrait.jpg', albumIndex: 2, tags: ['portrait', 'people', 'outdoor', 'natural-light'] },
  { title: 'Black & White Character Study', description: 'Monochrome portrait emphasizing texture', filename: 'bw-portrait.jpg', albumIndex: 2, tags: ['portrait', 'black-white', 'people', 'artistic'] },
  { title: 'Family Moment Captured', description: 'Candid family interaction in natural setting', filename: 'family-candid.jpg', albumIndex: 2, tags: ['portrait', 'people', 'candid', 'family'] },
  { title: 'Senior Portrait with Wisdom', description: 'Dignified portrait of elderly person', filename: 'senior-portrait.jpg', albumIndex: 2, tags: ['portrait', 'people', 'black-white', 'character'] },
  
  { title: 'Rainy Street Reflections', description: 'City lights reflected on wet pavement', filename: 'rainy-street.jpg', albumIndex: 3, tags: ['street', 'urban', 'night', 'reflection', 'rain'] },
  { title: 'Busy Crosswalk Moment', description: 'Pedestrians crossing at busy intersection', filename: 'crosswalk.jpg', albumIndex: 3, tags: ['street', 'urban', 'people', 'candid', 'motion'] },
  { title: 'Neon Alley Atmosphere', description: 'Vibrant neon signs in narrow alleyway', filename: 'neon-alley.jpg', albumIndex: 3, tags: ['street', 'urban', 'night', 'neon', 'color'] },
  { title: 'Street Musician Performance', description: 'Talented busker entertaining passersby', filename: 'street-musician.jpg', albumIndex: 3, tags: ['street', 'people', 'candid', 'music', 'urban'] },
  { title: 'Morning Commute Shadows', description: 'Long shadows of commuters at sunrise', filename: 'commute-shadows.jpg', albumIndex: 3, tags: ['street', 'urban', 'sunrise', 'shadow', 'people'] },
  
  { title: 'Water Droplet on Leaf', description: 'Single droplet acting as a lens', filename: 'water-droplet.jpg', albumIndex: 4, tags: ['macro', 'closeup', 'nature', 'water', 'refraction'] },
  { title: 'Butterfly Wing Scales', description: 'Microscopic detail of butterfly wing', filename: 'butterfly-wing.jpg', albumIndex: 4, tags: ['macro', 'closeup', 'insect', 'pattern', 'texture'] },
  { title: 'Frost Crystal Formation', description: 'Intricate ice crystals on window pane', filename: 'frost-crystals.jpg', albumIndex: 4, tags: ['macro', 'closeup', 'ice', 'pattern', 'winter'] },
  { title: 'Flower Petal Texture', description: 'Velvet texture of rose petal in detail', filename: 'petal-texture.jpg', albumIndex: 4, tags: ['macro', 'closeup', 'flower', 'texture', 'abstract'] },
  { title: 'Eye Iris Macro Shot', description: 'Extreme closeup of human eye iris', filename: 'eye-iris.jpg', albumIndex: 4, tags: ['macro', 'closeup', 'eye', 'human', 'detail'] }
];

const SHARE_LINKS = [
  { albumIndex: 1, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
];

async function seedDatabase() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('Connected to database');

    // Reset seed data while retaining the app user's database permissions.
    console.log('Clearing existing data...');
    await connection.execute('DELETE FROM share_links');
    await connection.execute('DELETE FROM photo_tags');
    await connection.execute('DELETE FROM photos');
    await connection.execute('DELETE FROM albums');
    await connection.execute('DELETE FROM tags');
    await connection.execute('DELETE FROM users');

    // Insert users
    console.log('Inserting demo users...');
    const userIds = [];
    for (const user of DEMO_USERS) {
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      const [result] = await connection.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [user.username, user.email, hashedPassword, user.role]
      );
      userIds.push(result.insertId);
      console.log(`  Created user: ${user.username} (${user.email})`);
    }

    // Insert tags
    console.log('Inserting tags...');
    const tagIds = {};
    for (const tagName of DEMO_TAGS) {
      const [result] = await connection.execute(
        'INSERT INTO tags (name) VALUES (?)',
        [tagName]
      );
      tagIds[tagName] = result.insertId;
    }

    // Insert albums
    console.log('Inserting demo albums...');
    const albumIds = [];
    for (const album of DEMO_ALBUMS) {
      const [result] = await connection.execute(
        'INSERT INTO albums (title, description, user_id, is_public) VALUES (?, ?, ?, ?)',
        [album.title, album.description, userIds[album.userIndex], album.isPublic]
      );
      albumIds.push(result.insertId);
      console.log(`  Created album: ${album.title} (ID: ${result.insertId})`);
    }

    // Insert photos and photo_tags
    console.log('Inserting demo photos...');
    for (const photo of DEMO_PHOTOS) {
      const albumId = albumIds[photo.albumIndex];
      const [result] = await connection.execute(
        'INSERT INTO photos (title, description, filename, path, album_id, user_id, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [photo.title, photo.description, photo.filename, `/uploads/${photo.filename}`, albumId, userIds[DEMO_ALBUMS[photo.albumIndex].userIndex], true]
      );
      const photoId = result.insertId;
      console.log(`  Created photo: ${photo.title} (ID: ${photoId})`);

      // Insert photo_tags
      for (const tagName of photo.tags) {
        if (tagIds[tagName]) {
          await connection.execute(
            'INSERT INTO photo_tags (photo_id, tag_id) VALUES (?, ?)',
            [photoId, tagIds[tagName]]
          );
        }
      }
    }

    // Insert share links
    console.log('Inserting share links...');
    for (const share of SHARE_LINKS) {
      const albumId = albumIds[share.albumIndex];
      const [result] = await connection.execute(
        'INSERT INTO share_links (album_id, token, expires_at, created_by) VALUES (?, ?, ?, ?)',
        [albumId, share.token, share.expiresAt, userIds[0]]
      );
      console.log(`  Created share link for album ${albumId}`);
    }

    console.log('\n✅ Seed completed successfully!');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();