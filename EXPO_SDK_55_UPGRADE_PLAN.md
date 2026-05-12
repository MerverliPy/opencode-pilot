# Expo SDK 55 Upgrade Plan for Pilot

> **Status:** Planning complete — ready for execution  
> **Current:** Expo SDK 54.0.34 / React Native 0.81.5 / React 19.1.0  
> **Target:** Expo SDK 55.x / React Native 0.83.x / React 19.2.x  
> **Risk Level:** Low-Medium (no native directories, no high-risk dependencies)

---

## 1. Executive Summary

Expo SDK 55 was released on **2026-02-25**. It ships with React Native 0.83.x and React 19.2.x. The most impactful change is the **mandatory New Architecture** (no opt-out), but Pilot already runs on the New Architecture since SDK 53+, so this is a non-issue.

Pilot uses **Continuous Native Generation (no `ios/` or `android/` directories)**, which makes this upgrade straightforward: dependency bumps + `npx expo install --fix` + clean prebuild.

No breaking changes in SDK 55 affect Pilot's current code or configuration. The upgrade is primarily a mechanical version-bump exercise.

---

## 2. Dependency Upgrade Matrix

| Package                          | Current    | Target (SDK 55) | Notes                            |
| -------------------------------- | ---------- | --------------- | -------------------------------- |
| `expo`                           | `^54.0.34` | `^55.0.0`       | Core SDK bump                    |
| `react`                          | `19.1.0`   | `19.2.0`        | Minor React bump                 |
| `react-native`                   | `0.81.5`   | `0.83.x`        | New Architecture mandatory       |
| `expo-clipboard`                 | `~8.0.8`   | `~55.0.0`       | Unified versioning               |
| `expo-constants`                 | `~18.0.13` | `~55.0.0`       | Unified versioning               |
| `expo-device`                    | `~8.0.10`  | `~55.0.0`       | Unified versioning               |
| `expo-font`                      | `~14.0.11` | `~55.0.0`       | Unified versioning               |
| `expo-haptics`                   | `~15.0.8`  | `~55.0.0`       | Unified versioning               |
| `expo-linking`                   | `~8.0.12`  | `~55.0.0`       | Unified versioning               |
| `expo-notifications`             | `~0.32.17` | `~55.0.0`       | Unified versioning               |
| `expo-router`                    | `~6.0.23`  | `~55.0.0`       | Unified versioning               |
| `expo-secure-store`              | `~15.0.8`  | `~55.0.0`       | Unified versioning               |
| `expo-sqlite`                    | `~16.0.10` | `~55.0.0`       | Unified versioning               |
| `expo-status-bar`                | `~3.0.9`   | `~55.0.0`       | Unified versioning               |
| `react-native-reanimated`        | `~4.1.1`   | `~4.1.1+`       | Verify compat with RN 0.83       |
| `react-native-gesture-handler`   | `~2.28.0`  | TBD             | Verify compat with RN 0.83       |
| `react-native-safe-area-context` | `~5.6.0`   | TBD             | Verify compat with RN 0.83       |
| `react-native-screens`           | `~4.16.0`  | TBD             | Verify compat with RN 0.83       |
| `react-native-worklets`          | `0.5.1`    | TBD             | Verify compat with reanimated v4 |
| `jest-expo`                      | `~52.0.6`  | `~55.0.0`       | Test runner update               |
| `@types/react`                   | `~19.1.10` | `~19.2.x`       | Match React version              |

---

## 3. Breaking Changes Assessment

| Change                                                   | Affects Pilot? | Action Required                                         |
| -------------------------------------------------------- | -------------- | ------------------------------------------------------- |
| New Architecture mandatory                               | ❌ No          | Already enabled by default since SDK 53                 |
| Unified package versioning (`~55.x.x`)                   | ⚠️ Indirectly  | All Expo packages get new version numbers               |
| `notification` field removed from `app.json`             | ❌ No          | Pilot never used this field                             |
| `expo-av` removed from Expo Go                           | ❌ No          | Pilot doesn't use `expo-av`                             |
| `expo-clipboard`: removed `content` from event listeners | ❌ No          | Pilot only uses `setStringAsync()` / `getStringAsync()` |
| `expo-router`: removed `ExpoRequest`/`ExpoResponse`      | ❌ No          | Pilot doesn't use server features                       |
| `edgeToEdgeEnabled` removed                              | ❌ No          | Not present in `app.json`                               |
| `experiments.reactCanary` removed                        | ❌ No          | Not present in `app.json`                               |
| `statusBar` removed from `app.json`                      | ❌ No          | Not present in `app.json`                               |
| `expo-blur`: `experimentalBlurMethod` → `blurMethod`     | ❌ No          | Pilot doesn't use `expo-blur`                           |
| `eas update` requires `--environment`                    | ⚠️ Maybe       | Only if CI uses `eas update`                            |
| Xcode 26 required for native builds                      | ⚠️ Maybe       | EAS Build env requirement                               |
| Expo Go stores lag behind (SDK 54)                       | ⚠️ Yes         | Must install SDK 55 Expo Go via CLI / TestFlight beta   |
| App config evaluation toolchain changed                  | ❌ No          | Pilot uses `app.json`, not `app.config.ts`              |

---

## 4. Step-by-Step Upgrade Procedure

### Phase A: Pre-Upgrade Safety

1. **Commit current state**

   ```bash
   git add -A && git commit -m "chore: pre-sdk-55 checkpoint"
   ```

2. **Verify current build works**

   ```bash
   npm install
   npx expo lint
   npx tsc --noEmit
   npm test
   ```

3. **Create upgrade branch**
   ```bash
   git checkout -b expo-sdk-55
   ```

### Phase B: Dependency Bumps

4. **Upgrade Expo core**

   ```bash
   npm install expo@^55.0.0
   ```

5. **Auto-fix peer dependencies**

   ```bash
   npx expo install --fix
   ```

   This will upgrade all Expo packages to their SDK 55 compatible versions.

6. **Manually bump React & types**

   ```bash
   npm install react@19.2.0 react-native@0.83.x
   npm install -D @types/react@~19.2.x
   ```

   (Exact `react-native` version will be determined by `expo install --fix`)

7. **Upgrade Jest tooling**
   ```bash
   npm install -D jest-expo@~55.0.0
   ```

### Phase C: Validation

8. **Type check**

   ```bash
   npx tsc --noEmit
   ```

9. **Lint**

   ```bash
   npx expo lint
   ```

10. **Run tests**

    ```bash
    npm test
    ```

11. **Expo Doctor**
    ```bash
    npx expo-doctor
    ```

### Phase D: Native Verification (optional, if using prebuild)

12. **Clean prebuild and test iOS**
    ```bash
    npx expo prebuild --clean
    npx expo run:ios
    ```

### Phase E: Finalize

13. **Commit upgrade**
    ```bash
    git add package.json package-lock.json
    git commit -m "chore: upgrade to Expo SDK 55"
    ```

---

## 5. Risk Assessment

| Risk                                                                             | Likelihood | Impact | Mitigation                                                        |
| -------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------- |
| `react-native-reanimated` / `react-native-worklets` incompatibility with RN 0.83 | Low        | High   | Check Reanimated changelog; bump if needed before SDK 55 upgrade  |
| `jest-expo` breaking changes affecting test suite                                | Low        | Medium | Run tests immediately after `jest-expo` upgrade; check config     |
| `expo-sqlite` API changes                                                        | Low        | Medium | Pilot uses standard SQLite API; verify on upgrade                 |
| `expo-router` subtle routing changes                                             | Low        | Medium | Smoke-test all routes after upgrade                               |
| Expo Go availability (stores still on SDK 54)                                    | High       | Low    | Install SDK 55 Expo Go via `npx expo start` CLI or use dev builds |
| Dependency tree conflicts (peer deps)                                            | Medium     | Medium | Use `npx expo install --fix`; resolve manually if needed          |
| TypeScript version mismatch                                                      | Low        | Low    | `@types/react` bump aligned with React 19.2                       |

---

## 6. Rollback Strategy

If the upgrade fails at any point:

```bash
git checkout main
npm install
npx expo-doctor
```

No native project directories exist, so there's no `ios/` or `android/` directory to clean up. Rollback is purely `git` + `npm install`.

---

## 7. Post-Upgrade Opportunities

Expo SDK 55 introduces features Pilot could adopt in future tasks:

- **Expo UI (Jetpack Compose + SwiftUI wrappers)** — Could replace custom modals with native-looking SwiftUI sheets on iOS.
- **`expo-widgets` (alpha)** — Aligns with Phase 4 backlog item `4.3 iOS home screen widget`.
- **Hermes v1 (opt-in)** — Meaningful performance improvement; may increase build time due to source compilation.
- **More native features in Expo Router** — Could simplify deep linking implementation (Phase 2.5).

These are **not part of the upgrade** but should be tracked in the backlog for v0.2.0+.

---

## 8. Validation Checklist (Execute During Upgrade)

- [ ] `npm install` completes without peer dependency warnings
- [ ] `npx expo-doctor` reports 0 issues
- [ ] `npx tsc --noEmit` passes
- [ ] `npx expo lint` passes (0 errors, 0 warnings)
- [ ] `npm test` passes (all 488+ tests)
- [ ] App launches in Expo Go / dev build
- [ ] Core user flows work: chat, memory, settings, file browser
- [ ] Push notifications still register and arrive
- [ ] SQLite operations (memory store) work correctly
- [ ] Deep linking (`pilot://`) still functions
- [ ] Clipboard copy/paste in messages works

---

_Plan generated: 2026-05-12_  
_Next step: Execute upgrade on branch `expo-sdk-55` when scheduled_
