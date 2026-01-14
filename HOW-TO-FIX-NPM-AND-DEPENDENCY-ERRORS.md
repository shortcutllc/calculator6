# Troubleshooting Guide

## Common Issues and Fixes

### "npm run dev" fails with module errors

**What happened:**
Your project's dependencies (the packages in `node_modules`) got corrupted or out of sync.

**How to fix:**
```bash
# Delete the corrupted files
rm -rf node_modules package-lock.json

# Get fresh copies of everything
npm install

# Try running again
npm run dev
```

**How to prevent:**
- Don't manually edit files in the `node_modules` folder
- Don't interrupt `npm install` while it's running (let it finish)
- If you switch git branches, run `npm install` again to make sure dependencies match
- If your computer crashes or restarts during installation, run the fix above

---

### Server won't start or shows port errors

**Fix:**
```bash
# Clean start (kills any stuck processes and clears cache)
npm run dev:clean
```

---

### After pulling code from git, things break

**Always run after pulling new code:**
```bash
npm install
```

This updates your dependencies to match what the code expects.

---

### General "when in doubt" fix

If something weird is happening and you're not sure why:
```bash
rm -rf node_modules package-lock.json
npm install
```

This is like turning it off and on again - it solves most dependency-related issues.
