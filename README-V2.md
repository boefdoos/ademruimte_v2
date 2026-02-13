# Ademruimte v2.0 🌬️

Next.js migration of Ademruimte - Evidence-based hulp bij hyperventilatie en gerelateerde klachten.

## ✅ Completed (Week 1-2)

### Project Setup
- ✅ Next.js 16 with TypeScript and Tailwind CSS
- ✅ Firebase Authentication (Email/Password)
- ✅ Firebase Firestore configuration
- ✅ Custom i18n system (NL/EN)
- ✅ Authentication flow (Login, Register, Password Reset)
- ✅ Responsive gradient background design
- ✅ Font Awesome icons integration

### File Structure
```
src/
├── app/
│   ├── auth/page.tsx        # Authentication page
│   ├── dashboard/page.tsx    # Dashboard (placeholder)
│   ├── layout.tsx            # Root layout with providers
│   └── page.tsx              # Home redirect logic
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ResetPasswordForm.tsx
│   └── ui/
│       └── Button.tsx
├── contexts/
│   ├── AuthContext.tsx       # Firebase auth state management
│   └── I18nContext.tsx       # Internationalization
└── lib/
    └── firebase/
        └── config.ts          # Firebase configuration
```

## 🚧 In Progress

- Testing authentication flow
- Migrating dashboard components

## 📋 Next Steps (Weeks 3-6)

### Dashboard Migration
- [ ] Streak counter with Firestore persistence
- [ ] Today's goals section
- [ ] Quick action buttons (Log CP, Log HRV, Log Journal)
- [ ] Activity feed/recent entries

### Exercises Migration
- [ ] Buteyko Method component
  - [ ] Control Pause timer
  - [ ] Exercise instructions
  - [ ] Progress tracking
- [ ] Resonant Breathing component
  - [ ] Audio-guided breathing
  - [ ] Duration selection (5/10/15/20 min)
  - [ ] Visual breathing indicator

### Tracking Migration
- [ ] HRV measurements with Chart.js
- [ ] Intensity trends visualization
- [ ] Trigger analysis
- [ ] Practice consistency calendar
- [ ] Correlation charts

### Data Models (Firestore)
```typescript
// User Document
users/{uid}
  - email: string
  - createdAt: timestamp
  - streak: number
  - lastActive: timestamp

// HRV Measurements
users/{uid}/hrv/{measurementId}
  - rmssd: number
  - heartRate: number
  - timestamp: timestamp
  - notes?: string

// CP Measurements
users/{uid}/cp/{measurementId}
  - seconds: number
  - timestamp: timestamp
  - beforeExercise: boolean

// Journal Entries
users/{uid}/journal/{entryId}
  - timestamp: timestamp
  - intensity: number (0-10)
  - triggers: string[]
  - sensations: string[]
  - notes: string
```

## 🏃 Running the Project

### Development
```bash
npm run dev
# Open http://localhost:3000
```

### Build
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
vercel --prod
```

## 🔑 Environment Variables

Create `.env.local`:
```
# Already configured in code, but can be overridden:
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 🎯 Beta Launch Goals (Weeks 7-13)

- [ ] Recruit 20 beta testers
- [ ] Achieve 30+ consecutive day usage
- [ ] Collect feedback on all features
- [ ] Identify top 3 feature requests
- [ ] Validate data model for v3.0 AI integration

## 🔄 Migration Status

| Feature | v1.0 (Single File) | v2.0 (Next.js) | Status |
|---------|-------------------|----------------|---------|
| Authentication | ✅ | ✅ | Complete |
| i18n (NL/EN) | ✅ | ✅ | Complete |
| Dashboard | ✅ | ⏳ | In Progress |
| Buteyko | ✅ | 📋 | Planned |
| Resonant Breathing | ✅ | 📋 | Planned |
| HRV Tracking | ✅ | 📋 | Planned |
| Journal | ✅ | 📋 | Planned |
| Charts | ✅ | 📋 | Planned |

## 📝 Technical Decisions

### Why Next.js?
- Component modularity (vs 8,572-line single file)
- Better dev experience with hot reload
- Type safety with TypeScript
- Built-in routing
- Server-side rendering capabilities for future SEO
- Easy Vercel deployment

### Why Custom i18n vs next-i18next?
- App Router compatibility
- Simpler implementation
- Client-side only (fits our use case)
- LocalStorage persistence

### Why Manual HRV Entry (for now)?
- Camera-based HRV would take 3-4 weeks to build
- Focus on beta validation first
- Can add in v3.0 if users demand it

## 🤝 Contributing

This is a private project for beta testing. Contributions welcome after v2.0 launch.

## 📧 Contact

Developed by Thomas Van Troostenberghe
