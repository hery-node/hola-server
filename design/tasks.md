# TypeScript Migration Tasks

## Phase 1: Project Setup
- [/] Create `src/` directory structure
- [ ] Create `tsconfig.json`
- [ ] Update `package.json` for ESM and TypeScript
- [ ] Install TypeScript and type dependencies

## Phase 2: Dependency Updates
- [ ] Update all dependencies to latest versions
- [ ] Remove `mongoist` dependency
- [ ] Add `@types/*` packages

## Phase 3: Core Module Migration (18 files)
- [ ] `core/type.ts`
- [ ] `core/meta.ts`
- [ ] `core/array.ts`
- [ ] `core/bash.ts`
- [ ] `core/chart.ts`
- [ ] `core/cron.ts`
- [ ] `core/date.ts`
- [ ] `core/encrypt.ts`
- [ ] `core/file.ts`
- [ ] `core/lhs.ts`
- [ ] `core/msg.ts`
- [ ] `core/number.ts`
- [ ] `core/obj.ts`
- [ ] `core/random.ts`
- [ ] `core/role.ts`
- [ ] `core/thread.ts`
- [ ] `core/url.ts`
- [ ] `core/validate.ts`

## Phase 4: Database Module Migration (3 files)
- [ ] `db/db.ts` (remove mongoist)
- [ ] `db/entity.ts`
- [ ] `db/gridfs.ts`

## Phase 5: HTTP Module Migration (8 files)
- [ ] `http/code.ts`
- [ ] `http/context.ts`
- [ ] `http/cors.ts`
- [ ] `http/error.ts`
- [ ] `http/express.ts`
- [ ] `http/params.ts`
- [ ] `http/router.ts`
- [ ] `http/session.ts`

## Phase 6: Router Module Migration (5 files)
- [ ] `router/clone.ts`
- [ ] `router/create.ts`
- [ ] `router/delete.ts`
- [ ] `router/read.ts`
- [ ] `router/update.ts`

## Phase 7: Entry Points and Tools
- [ ] `setting.ts`
- [ ] `index.ts`
- [ ] `tool/gen_i18n.ts`

## Phase 8: Build and Test
- [ ] Configure TypeScript build
- [ ] Update test imports
- [ ] Run all tests
- [ ] Verify build output

## Phase 9: Cleanup
- [ ] Remove old `.js` source files
- [ ] Update `.gitignore`
- [ ] Update `README.md`
- [ ] Final verification
