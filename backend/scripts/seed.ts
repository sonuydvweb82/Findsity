import { query, transaction, closeDb } from '../src/database/connection.js';
import { migrate } from '../src/database/migrate.js';
import { hashPassword } from '../src/utils/password.js';

const IMG: Record<string, string> = {
  headphones: '/demo-items/headphones.jpg',
  charger: '/demo-items/charger.jpg',
  book: '/demo-items/books.jpg',
  backpack: '/demo-items/backpack.jpg',
  watch: '/demo-items/watch.jpg',
  idcard: '/demo-items/id-card.jpg',
  keys: '/demo-items/keys.jpg',
  wallet: '/demo-items/wallet.jpg',
  usbc: '/demo-items/usb-c.jpg',
  bottle: '/demo-items/water-bottle.jpg',
  calculator: '/demo-items/calculator.jpg',
  umbrella: '/demo-items/umbrella.jpg',
  hoodie: '/demo-items/hoodie.jpg',
  powerbank: '/demo-items/power-bank.jpg',
  airpods: '/demo-items/airpods.jpg',
  pendrive: '/demo-items/pen-drive.jpg',
  glasses: '/demo-items/glasses.jpg',
  labcoat: '/demo-items/lab-coat.jpg',
  tiffin: '/demo-items/lunch-box.jpg',
};

const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

async function seed(): Promise<void> {
  await migrate();

  await transaction(async (q) => {
    await q(`TRUNCATE TABLE admin_actions, matches, handovers, messages, conversations, notifications, reports,
                      claim_answers, claims, item_images, items, verification_questions, categories, users RESTART IDENTITY CASCADE`);

    // Categories
    const categories = [
      ['id-card', 'ID Card', 'credit-card'],
      ['electronics', 'Electronics', 'headphones'],
      ['books', 'Books', 'book-open'],
      ['bags', 'Bags', 'backpack'],
      ['keys', 'Keys', 'key-round'],
      ['wallet', 'Wallet', 'wallet'],
      ['accessories', 'Accessories', 'watch'],
      ['documents', 'Documents', 'file-text'],
      ['clothing', 'Clothing', 'shirt'],
      ['other', 'Other', 'package'],
    ];
    const catIds: Record<string, number> = {};
    for (const [slug, name, icon] of categories) {
      const r = await q<{ id: number }>(`INSERT INTO categories (slug, name, icon) VALUES ($1, $2, $3) RETURNING id`, [
        slug,
        name,
        icon,
      ]);
      catIds[slug] = Number(r[0].id);
    }

    // Verification questions (the 7 standard ownership questions)
    const questions = [
      ['Where did you lose the item?', 'e.g. Main library, 3rd floor'],
      ['When did you lose it?', 'e.g. 12 March, around 4 PM'],
      ['What brand is it?', 'e.g. JBL'],
      ['What model is it?', 'e.g. Tune 510BT'],
      ['What color is it?', 'e.g. Black'],
      ['Describe one unique feature that is NOT visible in the public listing.', 'e.g. small scratch on the left earcup'],
      ['Do you have proof of ownership?', 'e.g. purchase receipt, photo of the item'],
    ];
    for (let i = 0; i < questions.length; i += 1) {
      await q(`INSERT INTO verification_questions (question, placeholder, required, sort_order) VALUES ($1, $2, true, $3)`, [
        questions[i][0],
        questions[i][1],
        i,
      ]);
    }

    // Users
    const passwordHash = await hashPassword('Password123');
    const user = async (fullName: string, email: string, college: string, studentId: string, role = 'user') => {
      const r = await q<{ id: string }>(
        `INSERT INTO users (full_name, email, password_hash, college, student_id, role)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [fullName, email, passwordHash, college, studentId, role],
      );
      return String(r[0].id);
    };

    const adminId = await user('Riya Verma', 'admin@findsity.edu', 'Findsity Campus Admin', 'ADM-0001', 'admin');
    const aarav = await user('Aarav Sharma', 'aarav@campus.edu', 'National Institute of Technology', 'NIT-221456', 'user');
    const priya = await user('Priya Patel', 'priya@campus.edu', 'National Institute of Technology', 'NIT-198734', 'user');
    const demo = await user('Demo Student', 'demo@findsity.edu', 'National Institute of Technology', 'NIT-345612', 'user');
    const kabir = await user('Kabir Singh', 'kabir@campus.edu', 'City College of Engineering', 'CCE-08721', 'user');

    // Items
    const item = async (opts: {
      userId: string;
      type: 'lost' | 'found';
      status: 'lost' | 'found' | 'return_pending' | 'returned';
      name: string;
      categorySlug: string;
      description: string;
      brand?: string;
      model?: string;
      color?: string;
      dateIncident: string;
      location: string;
      currentLocation?: string;
      privateFeatures?: string;
      image: string;
      reward?: string;
      notes?: string;
      createdAtDaysAgo: number;
    }) => {
      const r = await q<{ id: string }>(
        `INSERT INTO items (uid, user_id, type, status, name, category_id, description, brand, model, color,
                            date_incident, time_approx, location, location_details, current_location,
                            private_identifying_features, reward, notes, created_at)
         VALUES ('FD-' || substr(md5(random()::text), 1, 6), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now() - ($18 || ' days')::interval)
         RETURNING id`,
        [
          opts.userId,
          opts.type,
          opts.status,
          opts.name,
          catIds[opts.categorySlug],
          opts.description,
          opts.brand || '',
          opts.model || '',
          opts.color || '',
          opts.dateIncident,
          'Afternoon (2–5 PM)',
          opts.location,
          '',
          opts.currentLocation || '',
          opts.privateFeatures || '',
          opts.reward || '',
          opts.notes || '',
          opts.createdAtDaysAgo,
        ],
      );
      const id = String(r[0].id);
      await q(`INSERT INTO item_images (item_id, url, public_id, position) VALUES ($1, $2, $3, 0)`, [
        id,
        opts.image,
        opts.image,
      ]);
      return id;
    };

    const jblId = await item({
      userId: priya,
      type: 'found',
      status: 'found',
      name: 'Black JBL Headphones',
      categorySlug: 'electronics',
      description: 'Found a pair of black wireless JBL headphones near the library entrance. They are in good condition with the charging case.',
      brand: 'JBL',
      model: 'Tune 510BT',
      color: 'Black',
      dateIncident: daysAgo(3),
      location: 'Main Library, Entrance',
      currentLocation: 'Lost & Found desk, Student Center',
      privateFeatures: 'Small red sticker inside the charging case.',
      image: IMG.headphones,
      createdAtDaysAgo: 3,
    });

    await item({
      userId: aarav,
      type: 'lost',
      status: 'lost',
      name: 'Blue Lenovo Charger',
      categorySlug: 'electronics',
      description: 'Lost a blue Lenovo laptop charger with a 3-pin plug. It has a small dent near the brick.',
      brand: 'Lenovo',
      model: 'USB-C 65W',
      color: 'Blue',
      dateIncident: daysAgo(2),
      location: 'Lecture Hall B-204',
      reward: '₹200',
      image: IMG.charger,
      createdAtDaysAgo: 2,
    });

    await item({
      userId: aarav,
      type: 'lost',
      status: 'lost',
      name: 'Higher Engineering Mathematics Book',
      categorySlug: 'books',
      description: 'Lost "Higher Engineering Mathematics" by B.S. Grewal, 44th edition. Name written on the first page.',
      brand: 'Khanna Publishers',
      color: 'Green',
      dateIncident: daysAgo(5),
      location: 'Central Library, Section C',
      image: IMG.book,
      createdAtDaysAgo: 5,
    });

    await item({
      userId: kabir,
      type: 'found',
      status: 'found',
      name: 'Black College Backpack',
      categorySlug: 'bags',
      description: 'Found a black backpack with a yellow keychain charm in the sports complex. Contains a few notebooks.',
      brand: 'Wildcraft',
      color: 'Black',
      dateIncident: daysAgo(1),
      location: 'Sports Complex',
      currentLocation: 'Campus Security Office',
      privateFeatures: 'Yellow rubber duck keychain on the front zip.',
      image: IMG.backpack,
      createdAtDaysAgo: 1,
    });

    await item({
      userId: demo,
      type: 'lost',
      status: 'lost',
      name: 'Casio F-91W Watch',
      categorySlug: 'accessories',
      description: 'Lost a silver Casio digital watch with a black strap during the freshers fest.',
      brand: 'Casio',
      model: 'F-91W',
      color: 'Silver',
      dateIncident: daysAgo(4),
      location: 'Freshers Fest Ground',
      image: IMG.watch,
      createdAtDaysAgo: 4,
    });

    const idCardId = await item({
      userId: priya,
      type: 'found',
      status: 'found',
      name: 'College ID Card',
      categorySlug: 'id-card',
      description: 'Found a student ID card on the stairs near the cafeteria. To claim, you must answer the verification questions correctly.',
      dateIncident: daysAgo(2),
      location: 'Cafeteria Stairs',
      currentLocation: 'Campus Security Office',
      privateFeatures: 'The last two digits of the student ID are 82. The card has a small coffee stain on the corner.',
      image: IMG.idcard,
      createdAtDaysAgo: 2,
    });

    await item({
      userId: kabir,
      type: 'lost',
      status: 'lost',
      name: 'House Keys',
      categorySlug: 'keys',
      description: 'Lost a set of 3 keys on a silver ring with a small blue keychain fob.',
      dateIncident: daysAgo(6),
      location: 'Hostel Block C corridor',
      image: IMG.keys,
      createdAtDaysAgo: 6,
    });

    await item({
      userId: demo,
      type: 'found',
      status: 'found',
      name: 'Black Wallet',
      categorySlug: 'wallet',
      description: 'Found a black leather wallet near the ATM in the main building. Cash and cards intact. Verification required before return.',
      brand: 'Hidesign',
      color: 'Black',
      dateIncident: daysAgo(2),
      location: 'Main Building, ATM area',
      currentLocation: 'Campus Security Office',
      privateFeatures: 'Contains a folded note with "call mom" written on it.',
      image: IMG.wallet,
      createdAtDaysAgo: 2,
    });

    await item({
      userId: priya,
      type: 'lost',
      status: 'lost',
      name: 'White USB-C Charger',
      categorySlug: 'electronics',
      description: 'Lost a white USB-C phone charger (vivo 20W) in the computer lab.',
      brand: 'vivo',
      color: 'White',
      dateIncident: daysAgo(1),
      location: 'Computer Lab 3',
      image: IMG.usbc,
      createdAtDaysAgo: 1,
    });

    await item({
      userId: aarav,
      type: 'lost',
      status: 'lost',
      name: 'Blue Steel Water Bottle',
      categorySlug: 'other',
      description: 'Lost a blue steel water bottle with a carabiner clip, labeled "AARAV".',
      brand: 'Milton',
      color: 'Blue',
      dateIncident: daysAgo(3),
      location: 'Football Ground',
      image: IMG.bottle,
      createdAtDaysAgo: 3,
    });

    await item({
      userId: priya,
      type: 'found',
      status: 'found',
      name: 'Casio fx-991EX Calculator',
      categorySlug: 'electronics',
      description: 'Found a scientific calculator with a sticker of a cartoon cat on the back, left in the math tutorial room.',
      brand: 'Casio',
      model: 'fx-991EX',
      color: 'Black',
      dateIncident: daysAgo(1),
      location: 'Math Tutorial Room 12',
      currentLocation: 'Math department office',
      privateFeatures: 'Cartoon cat sticker on the back. The lid has a small crack.',
      image: IMG.calculator,
      createdAtDaysAgo: 1,
    });

    const jblLostId = await item({
      userId: kabir,
      type: 'lost',
      status: 'lost',
      name: 'JBL Tune 510BT Headphones',
      categorySlug: 'electronics',
      description: 'Lost my black JBL wireless headphones between the hostel and the academic block on my way to class.',
      brand: 'JBL',
      model: 'Tune 510BT',
      color: 'Black',
      dateIncident: daysAgo(2),
      location: 'Hostel to Academic Block path',
      image: IMG.headphones,
      createdAtDaysAgo: 2,
    });

    await item({
      userId: demo,
      type: 'lost',
      status: 'lost',
      name: 'Apple AirPods Pro',
      categorySlug: 'electronics',
      description: 'Lost my Apple AirPods Pro in the white case near the central library steps.',
      brand: 'Apple',
      model: 'AirPods Pro 2',
      color: 'White',
      dateIncident: daysAgo(1),
      location: 'Central Library Steps',
      image: IMG.airpods,
      createdAtDaysAgo: 1,
    });

    await item({
      userId: priya,
      type: 'found',
      status: 'found',
      name: 'Blue Umbrella',
      categorySlug: 'accessories',
      description: 'Found a blue umbrella with a curved wooden handle near the campus bus stop. Fully dry and folded.',
      color: 'Blue',
      dateIncident: daysAgo(2),
      location: 'Campus Bus Stop',
      currentLocation: 'Bus stop office',
      privateFeatures: 'Small white monogram "PS" near the handle.',
      image: IMG.umbrella,
      createdAtDaysAgo: 2,
    });

    await item({
      userId: aarav,
      type: 'found',
      status: 'found',
      name: 'Grey College Hoodie',
      categorySlug: 'clothing',
      description: 'Found a grey hoodie with the college name printed on the back, left in the auditorium after the seminar.',
      color: 'Grey',
      dateIncident: daysAgo(3),
      location: 'Auditorium',
      currentLocation: 'Auditorium help desk',
      privateFeatures: 'Pinned badge of the robotics club on the sleeve.',
      image: IMG.hoodie,
      createdAtDaysAgo: 3,
    });

    await item({
      userId: demo,
      type: 'lost',
      status: 'lost',
      name: 'SanDisk 32GB Pen Drive',
      categorySlug: 'electronics',
      description: 'Lost a blue SanDisk 32 GB pen drive with a black cap in the printing room. Contains my project files.',
      brand: 'SanDisk',
      color: 'Blue',
      dateIncident: daysAgo(2),
      location: 'Printing Room, Ground Floor',
      image: IMG.pendrive,
      createdAtDaysAgo: 2,
    });

    await item({
      userId: kabir,
      type: 'found',
      status: 'found',
      name: '10000mAh Power Bank',
      categorySlug: 'electronics',
      description: 'Found a white 10000 mAh power bank with a green charging cable in the canteen.',
      color: 'White',
      dateIncident: daysAgo(1),
      location: 'Canteen',
      currentLocation: 'Canteen counter',
      privateFeatures: 'Green braided cable; faint "KD" scratched on the back.',
      image: IMG.powerbank,
      createdAtDaysAgo: 1,
    });

    await item({
      userId: aarav,
      type: 'lost',
      status: 'lost',
      name: 'Prescription Glasses',
      categorySlug: 'accessories',
      description: 'Lost black rectangular prescription glasses in a navy-blue case somewhere in the science block.',
      color: 'Black',
      dateIncident: daysAgo(2),
      location: 'Science Block',
      image: IMG.glasses,
      createdAtDaysAgo: 2,
    });

    await item({
      userId: kabir,
      type: 'lost',
      status: 'lost',
      name: 'White Lab Coat',
      categorySlug: 'clothing',
      description: 'Lost my white lab coat with "K. Singh" written on the collar tag in the chemistry lab.',
      color: 'White',
      dateIncident: daysAgo(7),
      location: 'Chemistry Lab 2',
      image: IMG.labcoat,
      createdAtDaysAgo: 7,
    });

    await item({
      userId: demo,
      type: 'found',
      status: 'found',
      name: 'Steel Lunch Box',
      categorySlug: 'other',
      description: 'Found a two-tier steel lunch box with a red stripe left on the canteen table after lunch.',
      color: 'Silver',
      dateIncident: daysAgo(1),
      location: 'Canteen',
      currentLocation: 'Canteen counter',
      privateFeatures: '"VP" initials scratched on the lid; orange inner containers.',
      image: IMG.tiffin,
      createdAtDaysAgo: 1,
    });

    // A completed return story: Kabir found Aarav's maths book earlier (returned).
    const returnedId = await item({
      userId: kabir,
      type: 'found',
      status: 'returned',
      name: 'Higher Engineering Mathematics (B.S. Grewal)',
      categorySlug: 'books',
      description: 'Found on a library desk and returned to its owner.',
      color: 'Green',
      dateIncident: daysAgo(10),
      location: 'Central Library, Section C',
      currentLocation: 'Campus Security Office',
      privateFeatures: 'Owner name written on the first page.',
      image: IMG.book,
      createdAtDaysAgo: 12,
    });

    // Completed claim + handover on the returned item
    const returnedClaim = await q<{ id: string }>(
      `INSERT INTO claims (uid, item_id, claimant_id, risk_level, status, lost_location, lost_date, brand, model, color, unique_feature, proof_of_ownership, additional_info)
       VALUES ('CL-SEED01', $1, $2, 'medium', 'returned', 'Central Library, Section C', $3, 'Khanna Publishers', '', 'Green', 'My name is written on the first page of the book.', 'I had a photo of the book on my desk.', '')
       RETURNING id`,
      [returnedId, aarav, daysAgo(11)],
    );
    await q(
      `INSERT INTO handovers (claim_id, pickup_location, scheduled_date, scheduled_time, notes, arranged_by, finder_confirmed_at, claimant_confirmed_at, status)
       VALUES ($1, 'Campus Security Office', $2, '4:00 PM', 'Handed over at the security desk.', $3, now() - interval '6 days', now() - interval '6 days', 'completed')`,
      [String(returnedClaim[0].id), daysAgo(6), kabir],
    );

    // A pending claim on the JBL headphones (Priya = finder, Kabir = claimant)
    const pendingClaim = await q<{ id: string }>(
      `INSERT INTO claims (uid, item_id, claimant_id, risk_level, status, lost_location, lost_date, brand, model, color, unique_feature, proof_of_ownership, additional_info)
       VALUES ('CL-SEED02', $1, $2, 'medium', 'pending', 'Main Library, Entrance', $3, 'JBL', 'Tune 510BT', 'Black', 'There is a small red sticker inside the charging case.', 'I have the purchase receipt from Croma.', 'Left them on the table while returning books.')
       RETURNING id`,
      [jblId, kabir, daysAgo(2)],
    );
    const answers = [
      ['Where did you lose the item?', 'Main Library, Entrance'],
      ['When did you lose it?', daysAgo(3)],
      ['What brand is it?', 'JBL'],
      ['What model is it?', 'Tune 510BT'],
      ['What color is it?', 'Black'],
      ['Describe one unique feature that is NOT visible in the public listing.', 'There is a small red sticker inside the charging case.'],
      ['Do you have proof of ownership?', 'I have the purchase receipt from Croma.'],
    ];
    const qRows = await q<{ id: number; question: string }>(
      `SELECT id, question FROM verification_questions ORDER BY sort_order, id`,
    );
    for (const [questionText, answer] of answers) {
      const qRow = qRows.find((r) => r.question === questionText);
      if (qRow) {
        await q(`INSERT INTO claim_answers (claim_id, question_id, answer) VALUES ($1, $2, $3)`, [
          String(pendingClaim[0].id),
          qRow.id,
          answer,
        ]);
      }
    }

    // A pending claim on the ID card (high risk) from Kabir
    await q(
      `INSERT INTO claims (uid, item_id, claimant_id, risk_level, status, lost_location, lost_date, unique_feature, proof_of_ownership)
       VALUES ('CL-SEED03', $1, $2, 'high', 'pending', 'Cafeteria Stairs', $3, 'The last two digits of my student ID are 82.', 'I can show my college registration letter.')
       RETURNING id`,
      [idCardId, kabir, daysAgo(2)],
    );

    // A conversation between Aarav and Kabir about the returned maths book
    const conv = await q<{ id: string }>(
      `INSERT INTO conversations (user1_id, user2_id, item_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [aarav, kabir, returnedId],
    );
    await q(
      `INSERT INTO messages (conversation_id, sender_id, body, read_at) VALUES
       ($1, $2, 'Hi! I think I found your maths book in the library. Can we meet at the entrance?', now() - interval '8 days'),
       ($1, $3, 'That would be great — I will be there at 4 PM tomorrow.', now() - interval '8 days'),
       ($1, $2, 'Perfect, thank you so much!', now() - interval '6 days')`,
      [String(conv[0].id), kabir, aarav],
    );

    // Notifications for demo users
    await q(
      `INSERT INTO notifications (user_id, type, title, body, link) VALUES
       ($1, 'claim_submitted', 'New claim on your listing', 'Kabir Singh submitted a claim for "Black JBL Headphones".', '/claims/' || $2),
       ($1, 'match_found', 'Possible match found', 'A lost "JBL Tune 510BT Headphones" could be related to your found item.', '/items/' || $3),
       ($4, 'claim_approved', 'Your claim was approved', 'Your claim for the maths book was approved. Arrange a handover.', '/claims/' || $5),
       ($4, 'system', 'Welcome to Findsity! 👋', 'Lost it? Find it. Found it? Return it.', '/dashboard')`,
      [priya, String(pendingClaim[0].id), jblId, aarav, String(returnedClaim[0].id)],
    );

    // A match row linking Kabir's lost JBL headphones to Priya's found pair
    await q(
      `INSERT INTO matches (lost_item_id, found_item_id, score, reasons, notified_owner)
       VALUES ($1, $2, 82, '["Same category","Similar item name","Same brand","Same model","Nearby location"]'::jsonb, true)`,
      [jblLostId, jblId],
    );
  });

  console.log('------------------------------------------------------------');
  console.log('[seed] Findsity database seeded.');
  console.log('[seed] Admin:    admin@findsity.edu / Password123');
  console.log('[seed] Students: aarav@campus.edu, priya@campus.edu, demo@findsity.edu, kabir@campus.edu');
  console.log('[seed] All seed accounts use password: Password123');
  console.log('------------------------------------------------------------');
}

seed()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });