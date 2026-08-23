                         ┌──────────────────────┐
                         │       Next.js        │
                         │                      │
                         │  Dashboard           │
                         │  Procurement UI      │
                         │  Supplier UI         │
                         │  PO UI               │
                         │  Invoice UI          │
                         │  Exception UI        │
                         └──────────┬───────────┘
                                    │ HTTPS
                                    ▼
                         ┌──────────────────────┐
                         │    Express API       │
                         │    TypeScript        │
                         │                      │
                         │ Auth / Validation    │
                         │ CRUD / Commands      │
                         │ API orchestration    │
                         └───────┬───────┬──────┘
                                 │       │
                         sync    │       │ async
                                 │       ▼
                                 │   ┌─────────────┐
                                 │   │ Redis       │
                                 │   │ BullMQ      │
                                 │   └──────┬──────┘
                                 │          │
                                 │    ┌─────┼───────────────┐
                                 │    │     │               │
                                 │    ▼     ▼               ▼
                                 │  Req.  Invoice        Matching
                                 │ Worker Worker         Worker
                                 │    │     │               │
                                 │    └─────┼───────────────┘
                                 │          │
                                 ▼          ▼
                         ┌──────────────────────┐
                         │     PostgreSQL       │
                         │       Prisma         │
                         └──────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                    ┌───────────┐       ┌──────────┐
                    │    S3     │       │ Gemini   │
                    │ Documents │       │ AI/Vision│
                    └───────────┘       └──────────┘

Business Flow:
User Request
     ↓
Requirement Extraction
     ↓
Supplier Discovery
     ↓
Supplier Ranking
     ↓
Supplier Selection
     ↓
PO Generation
     ↓
PO Approval
     ↓
Shipment
     ↓
Goods Receipt
     ↓
Invoice Upload
     ↓
Invoice OCR + Extraction
     ↓
3-Way Matching
     ↓
 ┌───┴────┐
 ↓        ↓
PASS     FAIL
 ↓        ↓
Payment  Exception
          ↓
     Human Approval

procurement-backend/
│
├── src/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── workers/
│   ├── queues/
│   ├── ai/
│   ├── rules/
│   ├── storage/
│   ├── utils/
│   └── app.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── tests/
├── .env.example
├── Dockerfile
├── package.json
└── CLAUDE.md