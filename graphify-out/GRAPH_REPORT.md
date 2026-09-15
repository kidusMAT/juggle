# Graph Report - the_juggle  (2026-09-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 277 nodes · 564 edges · 34 communities (8 shown, 23 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5be38122`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- User
- views.py
- package.json
- UserSerializer
- GlobalSettings
- AutoConnectSocialAccountAdapter
- manage.py
- asgi.py
- settings.py
- core/urls.py
- wsgi.py
- test_signup.js
- 0001_initial.py
- 0002_remove_globalsettings_interval_duration_minutes_and_more.py
- 0003_rename_interval_duration_seconds_globalsettings_interval_duration_minutes.py
- 0004_product_stock_alter_jugglesession_product.py
- 0005_user_reserved_cb.py
- 0006_product_brand.py
- 0007_product_seller.py
- 0008_product_allow_juggling.py
- 0009_product_delivery_fee_product_delivery_type_and_more.py
- 0010_user_is_juggler.py
- 0011_cartitem.py
- 0012_globalsettings_site_fee_percentage_and_more.py
- 0013_product_attributes_category_product_category_and_more.py
- 0014_product_is_limited_user_business_name_and_more.py
- 0015_user_business_license_user_seller_phone.py
- 0016_user_seller_status.py
- 0017_user_address_proof_user_bank_details_proof_and_more.py
- 0018_user_deals_completed_user_pyramid_tier.py

## God Nodes (most connected - your core abstractions)
1. `User` - 43 edges
2. `Product` - 33 edges
3. `JuggleSession` - 27 edges
4. `UserSerializer` - 24 edges
5. `Category` - 19 edges
6. `GlobalSettings` - 18 edges
7. `react` - 16 edges
8. `UserViewSet` - 15 edges
9. `ProductSerializer` - 14 edges
10. `ProductViewSet` - 14 edges

## Surprising Connections (you probably didn't know these)
- `seed_categories()` --uses--> `Category`  [INFERRED]
  seed_categories.py → juggle/models.py
- `test_cb_logic()` --uses--> `User`  [INFERRED]
  test_cb.py → juggle/models.py
- `test_pyramid_logic()` --uses--> `User`  [INFERRED]
  test_pyramid_api.py → juggle/models.py
- `test_rotation()` --uses--> `User`  [INFERRED]
  test_rotation.py → juggle/models.py
- `seed()` --uses--> `GlobalSettings`  [INFERRED]
  seed.py → juggle/models.py

## Import Cycles
- None detected.

## Communities (34 total, 23 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.11
Nodes (24): App(), AccountPage(), ActiveJuggles(), AdminDashboard(), BuyerMarketplace(), placeholderColors, CartPage(), HubSidebar() (+16 more)

### Community 1 - "User"
Cohesion: 0.14
Nodes (22): AbstractUser, check_market(), ProductAdmin, UserAdmin, Category, JuggleSession, Meta, Product (+14 more)

### Community 2 - "views.py"
Cohesion: 0.10
Nodes (22): CartItem, ProductImage, ProductVariant, BuyerMarketSerializer, CartItemSerializer, CategorySerializer, DealSerializer, JuggleSessionSerializer (+14 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (35): dependencies, axios, lucide-react, react, react-dom, react-router-dom, devDependencies, eslint (+27 more)

### Community 4 - "UserSerializer"
Cohesion: 0.13
Nodes (9): action, UserSerializer, CartViewSet, cleanup_expired_juggles(), Allows a juggler to manually cancel their active session., Inactivates sessions ONLY if power is lost, or if manually cancelled. Ignores…, Update the quantity of an existing cart item., StandardResultsSetPagination (+1 more)

### Community 5 - "GlobalSettings"
Cohesion: 0.14
Nodes (8): GlobalSettings, Returns normalized pyramid state for the current time., Generates dynamic surviving-tier numbers based on the user's current BOX_SIZE., Site A direct purchase bypassing jugglers., Site A purchase: A buyer selects a specific juggler's session to buy from.…, test_cb_logic(), test_pyramid_logic(), test_rotation()

### Community 6 - "AutoConnectSocialAccountAdapter"
Cohesion: 0.29
Nodes (4): AutoConnectSocialAccountAdapter, MyAccountAdapter, DefaultAccountAdapter, DefaultSocialAccountAdapter

### Community 7 - "manage.py"
Cohesion: 0.50
Nodes (3): main(), Django's command-line utility for administrative tasks., Run administrative tasks.

## Knowledge Gaps
- **51 isolated node(s):** `Meta`, `Migration`, `Migration`, `Migration`, `Migration` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 125 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `views.py`, `UserSerializer`, `GlobalSettings`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `Product` connect `User` to `views.py`, `UserSerializer`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `UserSerializer` connect `UserSerializer` to `User`, `views.py`, `GlobalSettings`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `User` (e.g. with `check_market()` and `UserSerializer`) actually correct?**
  _`User` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `Product` (e.g. with `BuyerMarketSerializer` and `ProductSerializer`) actually correct?**
  _`Product` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `JuggleSession` (e.g. with `check_market()` and `JuggleSessionSerializer`) actually correct?**
  _`JuggleSession` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `UserSerializer` (e.g. with `GlobalSettings` and `User`) actually correct?**
  _`UserSerializer` has 5 INFERRED edges - model-reasoned connections that need verification._