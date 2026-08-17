# Findsity

### Campus Lost & Found, made simple.

Lost something on campus? Found something that isn't yours?

Findsity is a full-stack platform that helps students report lost and found items, discover possible matches, verify ownership, chat with the other person, and safely complete the return.

Instead of searching through WhatsApp groups, college notices, or asking around, Findsity keeps the entire process in one place.

---

## ✨ Features

### 🔎 Report Lost & Found Items

- Report an item as **Lost** or **Found**
- Add category, brand, model, colour, description and location
- Upload up to **6 photos** for an item
- Add an optional reward for lost items
- Found-item posts can include private identifying details
- Private identifying details are visible only to the finder and admins

### 🎯 Smart Item Matching

Findsity automatically looks for possible matches between lost and found items.

- Compares item names, categories and descriptions
- Uses token/Jaccard similarity to find relevant matches
- Possible matches are shown on the lost-item details page
- Match notifications are sent to the relevant users
- Matching uses a **55% similarity threshold**

### 🔐 Claims & Ownership Verification

Finding a similar item doesn't automatically prove ownership.

The claim system allows users to provide additional information to prove that an item belongs to them.

- Submit an ownership claim
- Answer verification questions
- Provide additional proof/details
- Automatic claim risk assessment
- High-risk claims can require admin review
- Finder can approve, reject or request more information
- Disputed rejected claims can be escalated for further review

### 🤝 Handover & Return Flow

Findsity separates **claim approval** from the actual physical return.

```text
Claim Approved
      ↓
Handover Arranged
      ↓
Location + Date + Time + Notes
      ↓
Finder & Claimant Confirm
      ↓
Item Handed Over
      ↓

The item moves from return_pending to returned only after the required confirmations are completed.

💬 Messaging & Notifications
Private conversations between users
Item-based conversations
Unread message counts
In-app notifications
Updates for claims, messages and handovers
Users can communicate before arranging a return
👤 Authentication & Profiles
User registration and login
JWT-based authentication
Forgot password and reset password flow
Profile avatar upload
User bio
Public user profiles
Protected account features
🛡️ Admin Console

The admin dashboard provides tools to manage the platform.

Dashboard statistics
Lost vs Found analytics
Return activity
Category statistics
Claim funnel
User management
User suspension
Item removal
Claim review
Report resolution
Audit information
🔒 Security & Privacy

Findsity includes several security and privacy measures:

bcrypt password hashing
JWT authentication
Rate limiting
Helmet security headers
CORS configuration
Zod request validation
Authorization checks
Ownership checks
Protected conversations
Masked student IDs in public listings
Soft deletes
Private claim information

🔄 How It Works

The complete Findsity flow is simple:
Lost / Found Item
       ↓
Possible Match
       ↓
Message
       ↓
Claim
       ↓
Verification
       ↓
Claim Approved
       ↓
Handover
       ↓
Both Confirm
       ↓
Returned ✅

The goal is to make the process clear from the moment an item is reported until it reaches its owner again.

🧑‍💻 How to Use
For someone who lost an item
Create an account or log in.
Report your item as Lost.
Add useful details and photos.
Check possible matches.
Open a conversation if you find a likely match.
Submit a claim when you believe the item is yours.
Complete the ownership verification.
Once approved, arrange a handover.
Confirm the item after receiving it.
For someone who found an item
Create an account or log in.
Report the item as Found.
Add photos and item details.
Keep unique identifying details private when appropriate.
Review possible claims.
Approve a legitimate claim or request more information.
Arrange the handover.
Confirm that the item has been handed over.
For administrators

Admins can access the admin dashboard to:

Review claims
Handle reports
Manage users
Remove inappropriate listings
Suspend accounts
Monitor platform activity
Review high-risk or disputed claims
🛠️ Technologies
Frontend
React 19
TypeScript
Vite
Tailwind CSS v4
React Router
Lucide React
React Hot Toast
Backend
Node.js
Express
TypeScript
JWT
bcrypt
Zod
Multer
Database
PGlite for local development
PostgreSQL support through DATABASE_URL
Development
Git
GitHub
npm
REST API architecture

📁 Project Structure
Findsity/
│
├── frontend/
│   ├── public/
│   │   └── demo-items/
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── pages/
│       ├── services/
│       ├── types/
│       └── utils/
│
├── backend/
│   ├── scripts/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── database/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── types/
│       └── utils/
│
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md

📱 Responsive Design

Findsity is designed to work across:

📱 Mobile
📲 Tablet
💻 Desktop

The interface adapts to different screen sizes while keeping the main workflows easy to use.

🚀 Future Improvements

Some ideas for future versions:

🗺️ Campus map integration
📧 College email verification
🔔 Real-time notifications
🤖 AI-assisted item matching
🏫 Multi-campus support
📊 Advanced analytics
📱 Progressive Web App
📲 Native mobile application

👨‍💻 Author

Sonu Kr Ydv

B.Tech CSE student and developer interested in building practical software that solves everyday problems.

Findsity was built as a project to make the campus lost-and-found process more organized, reliable and easier for students.
Both Confirm Receipt
      ↓
Returned ✅
