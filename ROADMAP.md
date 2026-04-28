# AggieMarket - Development Roadmap & Technical Specifications

> **Last Updated:** March 30, 2026  
> **Current Sprint:** Sprint 2 (Mar 23 – Apr 2)  
> **Tech Stack:** React Native/Expo + Bun.js/Elysia + SQLite

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Sprint 2 Specifications](#sprint-2-specifications)
  - [Spec 1: SQLite Performance Indexes](#spec-1-sqlite-performance-indexes)
  - [Spec 2: AWS S3 Image Upload](#spec-2-aws-s3-image-upload)
  - [Spec 3: SQLite FTS5 Full-Text Search](#spec-3-sqlite-fts5-full-text-search)
  - [Spec 4: Unified Search API](#spec-4-unified-search-api)
  - [Spec 5: Search Screen UI](#spec-5-search-screen-ui)
  - [Spec 6: Browse Listings Page](#spec-6-browse-listings-page)
  - [Spec 7: Component Updates](#spec-7-component-updates)
4. [Phase 2: Navigation & Core UX (Sprint 3)](#phase-2-navigation--core-ux-sprint-3)
  - [Spec 8: Bottom Tab Navigation](#spec-8-bottom-tab-navigation)
5. [Phase 3: User Profiles (Sprint 4)](#phase-3-user-profiles-sprint-4)
  - [Spec 9: Profile Database & API](#spec-9-profile-database--api)
  - [Spec 10: Profile Screen UI](#spec-10-profile-screen-ui)
6. [Phase 4: Messaging System (Sprint 5)](#phase-4-messaging-system-sprint-5)
  - [Spec 11: Messaging Database Schema](#spec-11-messaging-database-schema)
  - [Spec 12: Messaging API Routes](#spec-12-messaging-api-routes)
  - [Spec 13: Messages Inbox Screen](#spec-13-messages-inbox-screen)
  - [Spec 14: Chat Screen](#spec-14-chat-screen)
7. [Phase 5: Reviews & Ratings (Sprint 6)](#phase-5-reviews--ratings-sprint-6)
  - [Spec 15: Reviews Database & API](#spec-15-reviews-database--api)
8. [Phase 6: Saved Items (Sprint 7)](#phase-6-saved-items-sprint-7)
  - [Spec 16: Saved Items Database & API](#spec-16-saved-items-database--api)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [File Structure](#file-structure)
11. [Timeline Summary](#timeline-summary)

---

## Executive Summary

AggieMarket is a student-to-student marketplace for NMSU students. This document provides comprehensive technical specifications for completing Sprint 2 and the full feature roadmap through Sprint 7.

### Priority Features (User-Defined)

1. **Search** - "Search is most important"
2. **Messaging** - "Messaging is critical"
3. **Profiles** - "Profiles are key"

### Key Technical Decisions

- **Database:** SQLite (staying with current setup for ease of use)
- **Search:** SQLite FTS5 for full-text search
- **Image Storage:** AWS S3 with presigned URLs
- **Real-time:** Polling-based messaging (WebSocket optional enhancement)

---

## Current State

### What's Implemented (Sprint 1 Complete)


| Feature                                                 | Status     |
| ------------------------------------------------------- | ---------- |
| User authentication (register, login, OTP verification) | ✅ Complete |
| Listings CRUD                                           | ✅ Complete |
| Services CRUD                                           | ✅ Complete |
| Events CRUD                                             | ✅ Complete |
| Local image uploads                                     | ✅ Complete |
| Home feed with horizontal scroll                        | ✅ Complete |
| Detail views (listing, service, event)                  | ✅ Complete |
| Create post modal                                       | ✅ Complete |


### What's Missing (Per Wireframes)


| Feature               | Wireframe   | Implemented |
| --------------------- | ----------- | ----------- |
| Bottom Tab Navigation | Screen 1-7  | ❌           |
| Search & Filter Page  | Screen 2    | Partial     |
| Browse Listings Page  | Screen 3    | ❌           |
| Messaging System      | Screen 5    | ❌           |
| User Profiles         | Screen 7    | ❌           |
| Save/Favorite Items   | Screen 4    | ❌           |
| Reviews & Ratings     | Screen 4, 7 | ❌           |


---

## Sprint 2 Specifications

**Timeline:** Mar 23 – Apr 2  
**Estimated Effort:** ~16 hours

### Spec 1: SQLite Performance Indexes

#### Problem

No indexes exist on database tables. Queries will slow as data grows.

#### Solution

Add indexes in `server/src/db/index.ts` after table creation.

#### Schema Changes

```sql
-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);

-- Services indexes  
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_starts ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
```

#### Implementation

- **File:** `server/src/db/index.ts`
- **Position:** After all `CREATE TABLE` statements
- **Effort:** 15 minutes

---

### Spec 2: AWS S3 Image Upload

#### Problem

Images stored locally in `/uploads/` don't scale for production.

#### Solution

Integrate AWS S3 with presigned URLs for direct client uploads.

#### Dependencies

```bash
cd server
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### Environment Variables

Add to `server/.env`:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=aggiemarket-uploads
```

#### New File: `server/src/utils/s3.ts`

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME || "aggiemarket-uploads";

export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl };
}

export async function deleteS3Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3Client.send(command);
}

export function generateS3Key(userId: number, filename: string): string {
  const ext = filename.split(".").pop() || "jpg";
  const uuid = crypto.randomUUID();
  return `uploads/${userId}/${uuid}.${ext}`;
}
```

#### Updated Upload Route

Add to `server/src/routes/uploads.ts`:

```typescript
// GET presigned URL for S3 upload
.post(
  "/upload/presign",
  async ({ body, headers, jwt }) => {
    const token = (headers as any).authorization?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };

    const payload = await jwt.verify(token) as { id: number } | false;
    if (!payload) return { message: "Invalid token", status: 401 };

    const { filename, contentType } = body as { filename: string; contentType: string };

    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return { message: "Only JPEG, PNG, and WebP images are allowed", status: 400 };
    }

    const key = generateS3Key(payload.id, filename);
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

    return { uploadUrl, publicUrl, key, status: 200 };
  },
  {
    body: t.Object({
      filename: t.String(),
      contentType: t.String(),
    }),
  }
)
```

#### Frontend API Addition

Add to `AggieMarket/constants/api.ts`:

```typescript
uploadPresign: `${BASE}/upload/presign`,
```

#### S3 Bucket Configuration

**CORS Policy:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

**Bucket Policy (public read):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aggiemarket-uploads/uploads/*"
    }
  ]
}
```

#### Effort

- Backend: 2 hours
- Frontend: 1 hour
- AWS Setup: 30 minutes

---

### Spec 3: SQLite FTS5 Full-Text Search

#### Problem

Current search uses `LIKE '%query%'` which is slow and doesn't support relevance ranking.

#### Solution

Use SQLite FTS5 (Full-Text Search) extension, built into Bun's SQLite.

#### Schema Changes

Add to `server/src/db/index.ts`:

```sql
-- FTS5 virtual table for listings search
CREATE VIRTUAL TABLE IF NOT EXISTS listings_fts USING fts5(
  id,
  title,
  description,
  category,
  content='listings',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS listings_ai AFTER INSERT ON listings BEGIN
  INSERT INTO listings_fts(rowid, id, title, description, category)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.description, NEW.category);
END;

CREATE TRIGGER IF NOT EXISTS listings_ad AFTER DELETE ON listings BEGIN
  INSERT INTO listings_fts(listings_fts, rowid, id, title, description, category)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.description, OLD.category);
END;

CREATE TRIGGER IF NOT EXISTS listings_au AFTER UPDATE ON listings BEGIN
  INSERT INTO listings_fts(listings_fts, rowid, id, title, description, category)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.description, OLD.category);
  INSERT INTO listings_fts(rowid, id, title, description, category)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.description, NEW.category);
END;

-- FTS5 for services
CREATE VIRTUAL TABLE IF NOT EXISTS services_fts USING fts5(
  id,
  title,
  description,
  category,
  content='services',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS services_ai AFTER INSERT ON services BEGIN
  INSERT INTO services_fts(rowid, id, title, description, category)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.description, NEW.category);
END;

CREATE TRIGGER IF NOT EXISTS services_ad AFTER DELETE ON services BEGIN
  INSERT INTO services_fts(services_fts, rowid, id, title, description, category)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.description, OLD.category);
END;

CREATE TRIGGER IF NOT EXISTS services_au AFTER UPDATE ON services BEGIN
  INSERT INTO services_fts(services_fts, rowid, id, title, description, category)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.description, OLD.category);
  INSERT INTO services_fts(rowid, id, title, description, category)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.description, NEW.category);
END;

-- FTS5 for events
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  id,
  title,
  description,
  category,
  location,
  content='events',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(rowid, id, title, description, category, location)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.description, NEW.category, NEW.location);
END;

CREATE TRIGGER IF NOT EXISTS events_ad AFTER DELETE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, id, title, description, category, location)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.description, OLD.category, OLD.location);
END;

CREATE TRIGGER IF NOT EXISTS events_au AFTER UPDATE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, id, title, description, category, location)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.title, OLD.description, OLD.category, OLD.location);
  INSERT INTO events_fts(rowid, id, title, description, category, location)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.description, NEW.category, NEW.location);
END;
```

#### Migration for Existing Data

Run once to populate FTS tables:

```typescript
db.run(`INSERT INTO listings_fts(rowid, id, title, description, category) 
        SELECT rowid, id, title, description, category FROM listings`);
db.run(`INSERT INTO services_fts(rowid, id, title, description, category)
        SELECT rowid, id, title, description, category FROM services`);
db.run(`INSERT INTO events_fts(rowid, id, title, description, category, location)
        SELECT rowid, id, title, description, category, location FROM events`);
```

#### Updated Listings Route

Replace search logic in `server/src/routes/listings.ts`:

```typescript
.get("/listings", ({ query }) => {
  const { category, condition, minPrice, maxPrice, q, sort, limit, offset } = query as {
    category?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    q?: string;
    sort?: string;
    limit?: string;
    offset?: string;
  };

  const conditions: string[] = ["l.status = 'active'"];
  const params: any[] = [];
  let usesFTS = false;

  // Full-text search
  if (q && q.trim()) {
    usesFTS = true;
    const searchTerm = q.trim().split(/\s+/).map(word => `${word}*`).join(' ');
    conditions.push("l.id IN (SELECT id FROM listings_fts WHERE listings_fts MATCH ?)");
    params.push(searchTerm);
  }

  // Filters
  if (category && category !== 'All') {
    conditions.push("l.category = ?");
    params.push(category);
  }
  if (condition) {
    conditions.push("l.condition = ?");
    params.push(condition);
  }
  if (minPrice) {
    conditions.push("(l.price >= ? OR l.is_free = 1)");
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    conditions.push("l.price <= ?");
    params.push(Number(maxPrice));
  }

  const where = conditions.join(" AND ");

  // Sorting
  let orderBy = "l.created_at DESC";
  if (sort === 'price_asc') orderBy = "l.is_free DESC, l.price ASC";
  if (sort === 'price_desc') orderBy = "l.price DESC";

  // Pagination
  const limitNum = Math.min(parseInt(limit || '20'), 50);
  const offsetNum = parseInt(offset || '0');

  const listings = db.query(`
    SELECT l.*, 
           (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) AS image_url
    FROM listings l 
    WHERE ${where} 
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offsetNum);

  const countResult = db.query(`SELECT COUNT(*) as total FROM listings l WHERE ${where}`).get(...params) as { total: number };

  return { 
    listings, 
    total: countResult.total,
    limit: limitNum,
    offset: offsetNum,
    status: 200 
  };
})
```

#### Effort

- Schema changes: 1 hour
- Route updates: 2 hours
- Testing: 1 hour

---

### Spec 4: Unified Search API

#### Problem

Frontend needs to search across listings, services, and events simultaneously.

#### Solution

Create a unified `/search` endpoint.

#### New File: `server/src/routes/search.ts`

```typescript
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";

const searchRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))

  .get("/search", async ({ query, headers, jwt }) => {
    const token = (headers as any).authorization?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };

    const payload = await jwt.verify(token) as { id: number } | false;
    if (!payload) return { message: "Invalid token", status: 401 };

    const { q, type, limit } = query as {
      q?: string;
      type?: 'all' | 'listings' | 'services' | 'events';
      limit?: string;
    };

    if (!q || !q.trim()) {
      return { results: [], status: 200 };
    }

    const searchTerm = q.trim().split(/\s+/).map(word => `${word}*`).join(' ');
    const limitNum = Math.min(parseInt(limit || '10'), 20);
    const contentType = type || 'all';

    const results: any = {};

    if (contentType === 'all' || contentType === 'listings') {
      results.listings = db.query(`
        SELECT l.id, l.title, l.price, l.is_free, l.category, l.condition, 'listing' as type,
               (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) AS image_url
        FROM listings l
        WHERE l.status = 'active' AND l.id IN (SELECT id FROM listings_fts WHERE listings_fts MATCH ?)
        ORDER BY l.created_at DESC
        LIMIT ?
      `).all(searchTerm, limitNum);
    }

    if (contentType === 'all' || contentType === 'services') {
      results.services = db.query(`
        SELECT s.id, s.title, s.price, s.price_type, s.category, 'service' as type,
               (SELECT s3_url FROM service_images WHERE service_id = s.id ORDER BY sort_order ASC LIMIT 1) AS image_url
        FROM services s
        WHERE s.status = 'active' AND s.id IN (SELECT id FROM services_fts WHERE services_fts MATCH ?)
        ORDER BY s.created_at DESC
        LIMIT ?
      `).all(searchTerm, limitNum);
    }

    if (contentType === 'all' || contentType === 'events') {
      results.events = db.query(`
        SELECT e.id, e.title, e.starts_at, e.location, e.is_free, e.ticket_price, e.category, 'event' as type,
               (SELECT s3_url FROM event_images WHERE event_id = e.id ORDER BY sort_order ASC LIMIT 1) AS image_url
        FROM events e
        WHERE e.status = 'active' AND e.id IN (SELECT id FROM events_fts WHERE events_fts MATCH ?)
        ORDER BY e.starts_at ASC
        LIMIT ?
      `).all(searchTerm, limitNum);
    }

    return { results, query: q, status: 200 };
  });

export default searchRoutes;
```

#### Register in `server/index.ts`

```typescript
import searchRoutes from "./src/routes/search";
app.use(searchRoutes);
```

#### Effort

- 1 hour

---

### Spec 5: Search Screen UI

#### Problem

No dedicated search screen exists.

#### Solution

Create `app/search.tsx` matching wireframe Screen 2.

#### New File: `AggieMarket/app/search.tsx`

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CardV, Chips, SortRow, BackRow } from "../components";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";

const CATEGORIES = ["All", "Textbooks", "Electronics", "Furniture", "Clothing", "Services", "Events"] as const;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

type SearchResult = {
  id: string;
  title: string;
  price?: number;
  is_free?: number;
  category: string;
  condition?: string;
  image_url?: string;
  type: 'listing' | 'service' | 'event';
  starts_at?: string;
  price_type?: string;
};

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { token } = useAuth();

  const [query, setQuery] = useState(params.q || "");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState("newest");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const performSearch = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query.trim());
      if (category !== "All") {
        if (category === "Services") {
          params.append("type", "services");
        } else if (category === "Events") {
          params.append("type", "events");
        } else {
          params.append("type", "listings");
          params.append("category", category);
        }
      }
      params.append("sort", sort);
      params.append("limit", "20");

      const url = `${API.search}?${params}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const all: SearchResult[] = [
        ...(data.results?.listings || []),
        ...(data.results?.services || []),
        ...(data.results?.events || []),
      ];
      setResults(all);
      setTotal(all.length);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [query, category, sort, token]);

  useEffect(() => {
    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [performSearch]);

  function handleItemPress(item: SearchResult) {
    if (item.type === 'listing') router.push(`/listing/${item.id}`);
    else if (item.type === 'service') router.push(`/service/${item.id}`);
    else if (item.type === 'event') router.push(`/event/${item.id}`);
  }

  function formatPrice(item: SearchResult) {
    if (item.type === 'event') {
      return item.is_free ? "Free" : `$${item.ticket_price}`;
    }
    if (item.is_free) return "Free";
    if (item.price == null) return undefined;
    const suffix = item.price_type === 'hourly' ? '/hr' : '';
    return `$${item.price}${suffix}`;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.searchWrap}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.ink} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings, services, events..."
            placeholderTextColor={colors.mid}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={performSearch}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.mid} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Chips options={CATEGORIES} selected={category} onSelect={setCategory} />

      <View style={styles.sortRow}>
        <Text style={styles.resultCount}>
          {loading ? "Searching..." : `${total} results`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={48} color={colors.mid} />
          <Text style={styles.emptyText}>
            {query ? "No results found" : "Start typing to search"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <CardV
              title={item.title}
              price={formatPrice(item)}
              condition={item.condition}
              imageUrl={item.image_url}
              badge={item.type === 'service' ? 'Service' : item.type === 'event' ? 'Event' : undefined}
              onPress={() => handleItemPress(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backBtn: { padding: 4 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#212121",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#212121",
    padding: 0,
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  resultCount: { fontSize: 11, color: "#757575" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: "#BDBDBD" },
  grid: { padding: 12 },
  gridRow: { gap: 10, marginBottom: 10 },
});
```

#### Effort

- 3 hours

---

### Spec 6: Browse Listings Page

#### Problem

No dedicated page to browse all listings with category tabs (wireframe Screen 3).

#### Solution

Create `app/listings.tsx`.

#### New File: `AggieMarket/app/listings.tsx`

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { PhBar, CategoryTabs, CardV } from "../components";
import { colors } from "../theme/colors";
import { API } from "../constants/api";

const CATEGORIES = ["All", "Textbooks", "Electronics", "Furniture", "Clothing", "Other"] as const;

type Listing = {
  id: string;
  title: string;
  price: number | null;
  is_free: number;
  category: string;
  condition: string | null;
  image_url: string | null;
};

export default function ListingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  const [category, setCategory] = useState(params.category || "All");
  const [sort, setSort] = useState("newest");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchListings = useCallback(async () => {
    const queryParams = new URLSearchParams();
    if (category !== "All") queryParams.append("category", category);
    queryParams.append("sort", sort);
    queryParams.append("limit", "20");

    try {
      const res = await fetch(`${API.listings}?${queryParams}`);
      const data = await res.json();

      if (data.listings) {
        setListings(data.listings);
        setTotal(data.total || data.listings.length);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [category, sort]);

  useEffect(() => {
    setLoading(true);
    fetchListings();
  }, [category, sort]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <PhBar title="Browse Listings" />

      <CategoryTabs
        options={CATEGORIES}
        selected={category}
        onSelect={(c) => setCategory(c)}
      />

      <View style={styles.sortRow}>
        <Text style={styles.resultCount}>{total} listings</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No listings in this category</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CardV
              title={item.title}
              price={item.is_free ? "Free" : item.price != null ? `$${item.price}` : undefined}
              condition={item.condition}
              imageUrl={item.image_url}
              onPress={() => router.push(`/listing/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  resultCount: { fontSize: 11, color: "#757575" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 14, color: "#BDBDBD" },
  grid: { padding: 12 },
  gridRow: { gap: 10, marginBottom: 10 },
});
```

#### Effort

- 2 hours

---

### Spec 7: Component Updates

#### CardV Component Updates

Add `badge` and `onPress` props to `AggieMarket/components/CardV.tsx`:

```typescript
type CardVProps = {
  title: string;
  price?: string;
  condition?: string | null;
  imageUrl?: string | null;
  badge?: string;           // NEW
  onPress?: () => void;     // NEW
};
```

#### SortRow Component Updates

Make it a proper dropdown selector in `AggieMarket/components/SortRow.tsx`.

#### Effort

- 2 hours total

---

## Phase 2: Navigation & Core UX (Sprint 3)

**Timeline:** Apr 3 – Apr 13  
**Estimated Effort:** ~8 hours

### Spec 8: Bottom Tab Navigation

#### Problem

App lacks standard bottom tab navigation shown in wireframes.

#### Solution

Implement Expo Router's tab-based layout.

#### New File Structure

```
AggieMarket/app/
├── (tabs)/
│   ├── _layout.tsx           # Tab bar configuration
│   ├── index.tsx             # Home tab
│   ├── search.tsx            # Search tab
│   ├── messages.tsx          # Messages tab
│   └── profile.tsx           # Profile tab
├── create/
│   ├── _layout.tsx           # Modal layout
│   ├── index.tsx             # Type selector
│   ├── listing.tsx
│   ├── service.tsx
│   └── event.tsx
```

#### New File: `AggieMarket/app/(tabs)/_layout.tsx`

```typescript
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#212121",
        tabBarInactiveTintColor: "#757575",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: () => (
            <View style={styles.createBtn}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("create");
          },
        })}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 2,
    borderTopColor: "#212121",
    backgroundColor: "#FFFFFF",
    height: 60,
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "600",
  },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#212121",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
```

#### Effort

- 4 hours

---

## Phase 3: User Profiles (Sprint 4)

**Timeline:** Apr 14 – Apr 24  
**Estimated Effort:** ~8 hours

### Spec 9: Profile Database & API

#### Schema Updates

```sql
-- Add cover photo support
ALTER TABLE users ADD COLUMN cover_url TEXT;
```

#### New File: `server/src/routes/users.ts`

```typescript
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";

const usersRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))

  // GET public profile
  .get("/users/:id", ({ params }) => {
    const user = db.query(`
      SELECT id, name, bio, avatar_url, cover_url, rating_avg, rating_count, created_at
      FROM users WHERE id = ? AND status = 'active'
    `).get(params.id);

    if (!user) return { message: "User not found", status: 404 };

    const listingsCount = db.query(
      "SELECT COUNT(*) as count FROM listings WHERE seller_id = ? AND status = 'active'"
    ).get(params.id) as { count: number };

    return {
      user: { ...(user as object), listings_count: listingsCount.count },
      status: 200,
    };
  })

  // GET user's listings
  .get("/users/:id/listings", ({ params }) => {
    const listings = db.query(`
      SELECT l.*, 
             (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) AS image_url
      FROM listings l
      WHERE seller_id = ? AND status IN ('active', 'sold')
      ORDER BY created_at DESC
    `).all(params.id);

    return { listings, status: 200 };
  })

  // UPDATE own profile
  .patch("/users/me", async ({ body, headers, jwt }) => {
    const token = (headers as any).authorization?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };

    const payload = await jwt.verify(token) as { id: number } | false;
    if (!payload) return { message: "Invalid token", status: 401 };

    const { name, bio, avatar_url, cover_url } = body as {
      name?: string;
      bio?: string;
      avatar_url?: string;
      cover_url?: string;
    };

    db.run(`
      UPDATE users SET
        name = COALESCE(?, name),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url),
        cover_url = COALESCE(?, cover_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name ?? null, bio ?? null, avatar_url ?? null, cover_url ?? null, payload.id]);

    const user = db.query(
      "SELECT id, name, email, bio, avatar_url, cover_url, rating_avg, rating_count, status, created_at FROM users WHERE id = ?"
    ).get(payload.id);

    return { user, status: 200 };
  });

export default usersRoutes;
```

#### Effort

- 2 hours

---

### Spec 10: Profile Screen UI

Create `AggieMarket/app/(tabs)/profile.tsx` with:

- Cover photo and avatar
- User info (name, verified badge, member since, rating)
- Tabs: My Listings, Reviews, About
- Logout button

#### Effort

- 4 hours

---

## Phase 4: Messaging System (Sprint 5)

**Timeline:** Apr 25 – May 5  
**Estimated Effort:** ~12 hours

### Spec 11: Messaging Database Schema

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  listing_id TEXT,
  service_id TEXT,
  event_id TEXT,
  buyer_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  last_message_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
```

#### Effort

- 30 minutes

---

### Spec 12: Messaging API Routes

Create `server/src/routes/messages.ts` with:

- `GET /conversations` - List user's conversations
- `GET /conversations/unread-count` - Get unread badge count
- `GET /conversations/:id/messages` - Get messages in conversation
- `POST /conversations` - Start new conversation
- `POST /conversations/:id/messages` - Send message

#### Effort

- 3 hours

---

### Spec 13: Messages Inbox Screen

Create `AggieMarket/app/(tabs)/messages.tsx` with:

- Search conversations
- Conversation list with avatar, name, listing reference, preview, timestamp, unread badge
- Navigate to chat on tap

#### Effort

- 3 hours

---

### Spec 14: Chat Screen

Create `AggieMarket/app/chat/[id].tsx` with:

- Header with other user's name and listing info
- Message thread with bubbles
- Input with send button
- Polling for new messages (5-second interval)
- Optimistic UI updates

#### Effort

- 4 hours

---

## Phase 5: Reviews & Ratings (Sprint 6)

**Timeline:** May 6 – May 16  
**Estimated Effort:** ~6 hours

### Spec 15: Reviews Database & API

#### Schema

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  reviewer_id INTEGER NOT NULL,
  reviewed_user_id INTEGER NOT NULL,
  listing_id TEXT,
  service_id TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user ON reviews(reviewed_user_id);
```

#### API Endpoints

- `GET /users/:id/reviews` - Get reviews for a user
- `POST /reviews` - Create review (auto-updates user's rating_avg)

#### Effort

- 2 hours

---

## Phase 6: Saved Items (Sprint 7)

**Timeline:** May 17 – May 27  
**Estimated Effort:** ~4 hours

### Spec 16: Saved Items Database & API

#### Schema

```sql
CREATE TABLE IF NOT EXISTS saved_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_id TEXT,
  service_id TEXT,
  event_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, listing_id),
  UNIQUE(user_id, service_id),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_items(user_id);
```

#### API Endpoints

- `POST /listings/:id/save` - Toggle save (returns { saved: true/false })
- `GET /saved` - Get user's saved items

#### Effort

- 2 hours

---

## API Endpoints Reference

### Auth


| Method | Endpoint           | Auth | Description      |
| ------ | ------------------ | ---- | ---------------- |
| POST   | /auth/register     | No   | Create account   |
| POST   | /auth/verify-email | No   | Verify OTP       |
| POST   | /auth/login        | No   | Login            |
| GET    | /auth/me           | Yes  | Get current user |


### Users


| Method | Endpoint            | Auth | Description         |
| ------ | ------------------- | ---- | ------------------- |
| GET    | /users/:id          | No   | Get public profile  |
| GET    | /users/:id/listings | No   | Get user's listings |
| GET    | /users/:id/services | No   | Get user's services |
| GET    | /users/:id/reviews  | No   | Get user's reviews  |
| PATCH  | /users/me           | Yes  | Update own profile  |


### Listings


| Method | Endpoint           | Auth | Description            |
| ------ | ------------------ | ---- | ---------------------- |
| GET    | /listings          | No   | Browse/search listings |
| GET    | /listings/:id      | No   | Get single listing     |
| POST   | /listings          | Yes  | Create listing         |
| PATCH  | /listings/:id      | Yes  | Update listing         |
| DELETE | /listings/:id      | Yes  | Soft delete listing    |
| POST   | /listings/:id/save | Yes  | Toggle save            |


### Services


| Method | Endpoint      | Auth | Description            |
| ------ | ------------- | ---- | ---------------------- |
| GET    | /services     | Yes  | Browse/search services |
| GET    | /services/:id | Yes  | Get single service     |
| POST   | /services     | Yes  | Create service         |
| DELETE | /services/:id | Yes  | Soft delete service    |


### Events


| Method | Endpoint    | Auth | Description          |
| ------ | ----------- | ---- | -------------------- |
| GET    | /events     | Yes  | Browse/search events |
| GET    | /events/:id | No   | Get single event     |
| POST   | /events     | Yes  | Create event         |
| DELETE | /events/:id | Yes  | Soft delete event    |


### Search


| Method | Endpoint | Auth | Description    |
| ------ | -------- | ---- | -------------- |
| GET    | /search  | Yes  | Unified search |


### Uploads


| Method | Endpoint             | Auth | Description          |
| ------ | -------------------- | ---- | -------------------- |
| POST   | /upload/presign      | Yes  | Get S3 presigned URL |
| POST   | /listings/:id/images | Yes  | Attach image         |
| POST   | /services/:id/images | Yes  | Attach image         |
| POST   | /events/:id/images   | Yes  | Attach image         |


### Messages


| Method | Endpoint                    | Auth | Description        |
| ------ | --------------------------- | ---- | ------------------ |
| GET    | /conversations              | Yes  | List conversations |
| GET    | /conversations/unread-count | Yes  | Get unread count   |
| GET    | /conversations/:id/messages | Yes  | Get messages       |
| POST   | /conversations              | Yes  | Start conversation |
| POST   | /conversations/:id/messages | Yes  | Send message       |


### Reviews


| Method | Endpoint | Auth | Description   |
| ------ | -------- | ---- | ------------- |
| POST   | /reviews | Yes  | Create review |


### Saved


| Method | Endpoint | Auth | Description     |
| ------ | -------- | ---- | --------------- |
| GET    | /saved   | Yes  | Get saved items |


---

## File Structure

```
AggieMarket/
├── server/
│   ├── index.ts
│   ├── src/
│   │   ├── db/
│   │   │   └── index.ts              # Schema + indexes + FTS5
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── listings.ts           # + search, save
│   │   │   ├── services.ts           # + search, save
│   │   │   ├── events.ts             # + search, save
│   │   │   ├── uploads.ts            # + S3 presign
│   │   │   ├── users.ts              # NEW
│   │   │   ├── messages.ts           # NEW
│   │   │   ├── reviews.ts            # NEW
│   │   │   └── search.ts             # NEW
│   │   └── utils/
│   │       ├── email.ts
│   │       └── s3.ts                 # NEW
│   └── uploads/
│
├── AggieMarket/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx           # Tab bar
│   │   │   ├── index.tsx             # Home
│   │   │   ├── search.tsx            # Search
│   │   │   ├── messages.tsx          # Messages inbox
│   │   │   └── profile.tsx           # Profile
│   │   ├── create/
│   │   │   ├── _layout.tsx           # Modal layout
│   │   │   ├── index.tsx             # Type selector
│   │   │   ├── listing.tsx
│   │   │   ├── service.tsx
│   │   │   └── event.tsx
│   │   ├── chat/
│   │   │   └── [id].tsx              # Chat conversation
│   │   ├── user/
│   │   │   └── [id].tsx              # Public profile
│   │   ├── listing/[id].tsx
│   │   ├── service/[id].tsx
│   │   ├── event/[id].tsx
│   │   ├── listings.tsx              # Browse page
│   │   ├── edit-profile.tsx
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Landing
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── verify-email.tsx
│   ├── components/
│   └── constants/
│       └── api.ts
│
├── ROADMAP.md                        # This file
└── wireframes.html
```

---

## Timeline Summary


| Phase     | Sprint   | Dates           | Focus                                               | Est. Hours  |
| --------- | -------- | --------------- | --------------------------------------------------- | ----------- |
| 1         | Sprint 2 | Mar 23 – Apr 2  | Infrastructure: SQLite indexes, S3, FTS5, Search UI | 16 hrs      |
| 2         | Sprint 3 | Apr 3 – Apr 13  | Navigation: Tab bar, Create flow                    | 8 hrs       |
| 3         | Sprint 4 | Apr 14 – Apr 24 | Profiles: Profile screen, User API                  | 8 hrs       |
| 4         | Sprint 5 | Apr 25 – May 5  | Messaging: Inbox, Chat, Real-time                   | 12 hrs      |
| 5         | Sprint 6 | May 6 – May 16  | Trust: Reviews, Ratings                             | 6 hrs       |
| 6         | Sprint 7 | May 17 – May 27 | Engagement: Saved items, Reports                    | 4 hrs       |
| **Total** |          |                 |                                                     | **~54 hrs** |


---

## Priority Matrix


| Priority | Feature                 | Rationale                      |
| -------- | ----------------------- | ------------------------------ |
| **P0**   | Sprint 2 completion     | Foundation for everything else |
| **P0**   | Search (FTS5 + filters) | "Search is most important"     |
| **P1**   | Messaging               | "Messaging is critical"        |
| **P1**   | User Profiles           | "Profiles are key"             |
| **P2**   | Bottom Tab Navigation   | Essential mobile UX            |
| **P2**   | Reviews & Ratings       | Trust building                 |
| **P3**   | Saved Items             | Nice to have                   |
| **P3**   | Reporting               | Safety feature                 |


---

## Next Steps

1. Complete Sprint 2 remaining tasks (SQLite indexes, S3, FTS5, Search UI)
2. Run tests after each major change
3. Update this roadmap as features are completed
4. Consider WebSocket for real-time messaging in future iteration

