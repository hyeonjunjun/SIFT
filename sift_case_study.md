# Case Study: SIFT – The Digital Sanctuary

> **Role:** Lead Mobile Developer & Engineer  
> **Platform:** iOS & Android (React Native / Expo)  
> **Timeline:** 2026 (Ongoing)

![SIFT Banner Presentation](https://ix-www.imgix.net/hp/hero-1.png?auto=format,compress&w=1200) *(Placeholder: Replace with your actual hero image)*

## Project Overview

**Sift** is a digital sanctuary for curiosities. In a world of endless feeds and fleeting content, Sift uses advanced AI to transform chaotic social media links into a structured, editorial-grade library of recipes, routines, and research. It is designed to be the "quietest tool in your stack," elevating passive browsing into an active, beautifully organized knowledge base.

## The Problem: Information Overload

Modern digital consumers face a fragmented experience when trying to save and recall valuable information. Users constantly encounter useful content—recipes on TikTok, tutorials on YouTube, inspiration on X—but saving them means burying them in natively chaotic "Bookmark" tabs or disconnected note-taking apps. The essence of the content is often lost in the noise of the platform it was found on.

## The Solution: AI-Powered Curation

Sift acts as a smart filter. Instead of just saving a URL, Sift extracts the core value of the content, stripping away ads, comments, and algorithmic distractions. It distills complex media into structured, readable summaries, giving users ownership over their customized intellectual diet. 

---

## Key Features

### 🧠 Intelligent Extraction & Summarization
Users can share a link directly to Sift from any app. Behind the scenes, AI processes the link to generate structured data—turning a chaotic 15-minute cooking video into a clean, formatted recipe card.

### 🖋️ Editorial-Grade Typography & UI
To contrast the hyper-stimulating nature of social media, Sift utilizes a strict, minimalist design system. Leveraging premium typography (`Geist Mono`, `Instrument Serif`, `Lora`, and `Inter`), the interface mimics a high-end editorial magazine. Every pixel is designed for focus and calm.

### 🤝 Social Curation & Messaging
Sift isn't just a solitary archive. A built-in social environment allows users to connect with friends, send direct messages, and organically share their curated "Sifts." It includes a real-time chat interface with quick-react emoji grids and seamless content sharing.

### ✨ Fluid Micro-Interactions
The application utilizes premium, fluid animations (powered by `Reanimated` and `Moti`) with custom ease-in-out transitions, replacing harsh spring animations to ensure the app *feels* as calming as it looks.

---

## Technical Architecture

Sift is built on a modern, highly scalable mobile stack designed for maximum performance and developer velocity.

*   **Frontend:** React Native (Expo)
*   **Styling:** NativeWind (Tailwind CSS for React Native)
*   **State & Caching:** TanStack React Query + AsyncStorage (Offline-first capabilities)
*   **Backend / BaaS:** Supabase (Database, Authentication, Storage)
*   **Animations:** React Native Reanimated & Moti
*   **List Performance:** Shopify FlashList
*   **Monetization:** RevenueCat (`react-native-purchases`)
*   **Deployment:** Expo Application Services (EAS Build & Submit)

---

## Technical Challenges & Solutions

### 1. Achieving 60FPS with Complex UI & Animations
**Challenge:** Rendering heavily customized, responsive components (cards with dynamic heights, markdown rendering, and images) while maintaining smooth scroll performance and complex transition animations.
**Solution:** Migrated standard `FlatList` components to `@shopify/flash-list` for efficient recycling. Offloaded complex animation calculations to the UI thread using `react-native-reanimated` worklets, significantly reducing React Native bridge traffic. Refined animation curves to prevent state-update infinite loops (max update depth) during rapid navigation.

### 2. Dynamic Theming & Accessibility
**Challenge:** Ensuring perfect readability across a dynamic, user-curated environment in both Light and Dark modes without sacrificing the premium aesthetic.
**Solution:** Built a robust, centralized design token system within NativeWind. Implemented dynamic contrast checkers that automatically adjust text and icon colors within chat bubbles and media overlays to ensure WCAG compliance regardless of the underlying content.

### 3. Real-Time Social Synchronization
**Challenge:** Implementing instant messaging and friend request synchronization without draining battery or causing stale data states.
**Solution:** Utilized Supabase real-time subscriptions paired with TanStack Query's optimistic updates. When a user sends a message or reacts, the UI updates instantly while the mutation syncs with the PostgreSQL backend in the background seamlessly.

---

## The Impact

Sift successfully delivers on its promise of being a "**Digital Sanctuary**." By combining powerful backend AI summarization with an aggressively minimal, editorial frontend, Sift provides an elevated digital consumption experience.

> *"Turn your passive browsing into an active knowledge base. Create a sanctuary for your curiosities where clarity replaces clutter."*

---
*Note for portfolio: Be sure to attach a few screenshots or GIFs showcasing the onboarding flow, the typography scale, and the fluid animations!*
