# GalagaV - Developer & Feature Guide

## 🌟 Overview
GalagaV is a hybrid application combining a robust **Project Management Dashboard** with a fully playable **Arcade Space Shooter**. It is built with **React 18**, **TypeScript**, and **Tailwind CSS**, utilizing **Vite** for the build tooling. It supports offline persistence via LocalStorage and optional cloud features via Firebase and Google Gemini.

---

## 🔌 Plugin System
GalagaV supports a dynamic plugin architecture. You can build and upload custom tools or themes as `.zip` archives.

*   **Packaging Guide**: See [PLUGIN_PACKAGING.md](./PLUGIN_PACKAGING.md) for full instructions on building and zipping plugins.
*   **Architecture**: Uses UMD modules and shared window globals (`window.React`, `window.Lucide`) to keep plugins lightweight.

---

## 🚀 Features Breakdown
... (rest of the file remains same) ...
