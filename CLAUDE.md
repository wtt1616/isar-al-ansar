# iSAR - Surau Al-Ansar

Sistem Pengurusan Surau Al-Ansar.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server (port 3001)
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create `.env.local` with:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=isar_al_ansar
DB_PORT=3306

NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3001

NODE_ENV=development
ENCRYPTION_KEY=your-32-byte-hex-key
```

## Production

- **URL**: https://al-ansar.isar.my
- **Database**: isar_al_ansar

## TODO

- [ ] Update bank account details in:
  - `components/FloatingFooter.tsx`
  - `app/infaq/page.tsx`
  - `app/khairat/daftar/page.tsx`
- [ ] Update lokasi surau in various pages
- [ ] Upload logo to `/public/images/surau-logo.png`
- [ ] Upload QR code to `/public/qr_sar.jpeg`

---

**Last Updated**: 2025-12-28
