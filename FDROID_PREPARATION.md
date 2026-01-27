# F-Droid Preparation Guide for GrocyLite

## Current Blockers

### 1. Google Play Services Dependency

**File**: `android/app/build.gradle` (line 121)

```gradle
implementation 'com.google.android.gms:play-services-location:21.0.1'
```

**Solution**: Create build flavors

### 2. React Native Maps

Uses Google Maps by default, which is not F-Droid compatible.

**Solution**: Use OpenStreetMap or make maps optional

---

## Step-by-Step Guide

### Step 1: Create Build Flavors

Edit `android/app/build.gradle`:

```gradle
android {
    // ... existing config ...

    flavorDimensions "version"
    productFlavors {
        gms {
            dimension "version"
            applicationIdSuffix ".gms"
            versionNameSuffix "-gms"
        }
        foss {
            dimension "version"
            applicationIdSuffix ".foss"
            versionNameSuffix "-foss"
        }
    }
}

dependencies {
    // ... existing dependencies ...

    // Google Play Services only for GMS flavor
    gmsImplementation 'com.google.android.gms:play-services-location:21.0.1'

    // FOSS alternatives
    // fossImplementation 'org.osmdroid:osmdroid-android:6.1.14' // For maps
}
```

### Step 2: Handle Maps Conditionally

Create a wrapper for maps functionality:

**File**: `src/services/MapService.ts`

```typescript
import { Platform } from 'react-native';

// Check if running FOSS build
const isFOSS = Platform.select({
  android: () => {
    // Check build variant
    return false; // Implement build variant check
  },
  default: () => false,
})();

export const MapService = {
  isAvailable: !isFOSS,
  // Add map-related methods
};
```

### Step 3: Add F-Droid Metadata

Create `metadata/en-US/` directory with:

1. **full_description.txt**

```
GrocyLite is a mobile application for managing grocery inventory, sales, and warehouse operations.

Features:
- Sales management and approval
- Inventory tracking
- Stock opname
- Profit & loss reporting
- Multi-language support (English & Indonesian)
```

2. **short_description.txt**

```
Grocery inventory and sales management app
```

3. **title.txt**

```
GrocyLite
```

### Step 4: Add LICENSE File

Ensure you have a proper open-source license (e.g., GPL-3.0, Apache-2.0, MIT)

### Step 5: Submit to F-Droid

1. Fork the F-Droid Data repository: https://gitlab.com/fdroid/fdroiddata
2. Create a metadata file for your app
3. Submit a merge request

**Example metadata file** (`metadata/com.grocylite.foss.yml`):

```yaml
Categories:
  - Office
  - Money
License: GPL-3.0-or-later
AuthorName: Your Name
AuthorEmail: your.email@example.com
SourceCode: https://github.com/yourusername/GrocyLite
IssueTracker: https://github.com/yourusername/GrocyLite/issues

AutoName: GrocyLite
Description: |-
  GrocyLite is a mobile application for managing grocery inventory, sales, and warehouse operations.

RepoType: git
Repo: https://github.com/yourusername/GrocyLite

Builds:
  - versionName: '1.0'
    versionCode: 1
    commit: v1.0
    subdir: android/app
    gradle:
      - foss
    prebuild: cd ../.. && npm install

AutoUpdateMode: Version v%v
UpdateCheckMode: Tags
CurrentVersion: '1.0'
CurrentVersionCode: 1
```

---

## Alternative: Simpler Approach

If you don't need location/maps features for F-Droid users:

1. Remove Google Play Services dependency
2. Make location features optional with feature flags
3. Use only FOSS-compatible libraries

---

## Testing F-Droid Build

Build the FOSS flavor locally:

```bash
cd android
./gradlew assembleFossRelease
```

The APK will be in: `android/app/build/outputs/apk/foss/release/`

---

## Resources

- F-Droid Inclusion Guide: https://f-droid.org/docs/Inclusion_Policy/
- F-Droid Build Metadata: https://f-droid.org/docs/Build_Metadata_Reference/
- React Native F-Droid Examples: Search for "react-native" on F-Droid

---

## Checklist

- [ ] Remove/isolate Google Play Services
- [ ] Create FOSS build flavor
- [ ] Add open-source license
- [ ] Create F-Droid metadata
- [ ] Test FOSS build locally
- [ ] Push code to public Git repository
- [ ] Submit to F-Droid
