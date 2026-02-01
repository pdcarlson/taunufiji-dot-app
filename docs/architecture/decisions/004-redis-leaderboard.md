# 004. Redis for Leaderboard Caching

Date: 2024-02-01
Status: Accepted

## Context

The application's leaderboard feature required querying the primary database (Appwrite) and sorting by points, which could become a performance bottleneck as the user base grows. We desired a high-performance solution for reading rankings and user metadata.

## Decision

We implemented **Polyglot Persistence** using **Redis** alongside Appwrite.

1.  **Write-Through Caching:** The `PointsService` writes to Appwrite (Source of Truth) AND updates Redis synchronously (or fire-and-forget for resilience).
2.  **Data Structures:**
    - `Sorted Set (ZSET)` for the leaderboard (`leaderboard`: scores mapped to user IDs).
    - `Hash` for User Metadata (`user:{id}`: name, avatar).
3.  **Read Path:** The `getLeaderboard` query attempts to read from Redis first (`ZREVRANGE`). If Redis is unavailable or empty, it falls back to Appwrite.
4.  **Isolation:** Logic is encapsulated within `PointsService`.

## Consequences

**Positive:**

- **Performance:** Redis provides O(log(N)) or O(1) access for rank operations.
- **Scalability:** Offloads read traffic from the primary database.

**Negative:**

- **Complexity:** Two data stores to maintain.
- **Consistency:** Potential for drift if Redis update fails but Appwrite succeeds (handled via simple error logging for now; eventual consistency acceptable for leaderboard).
