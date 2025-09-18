# ⚡ asteris.js

A fast, flexible commands & events loader — perfect for [discord.js](https://discord.js.org).

## 📦 Installation

```
npm install @wxrayut/asteris.js
```

## 🚀 Quick Start

```typescript
import { asteris, AsterisOptions } from "@wxrayut/asteris.js";

const options: AsterisOptions = {
    recursive: false, 
    extension: [".ts"]
};

await asteris("./commands", (command, path) => {
    // Do something with the loaded command
}, options);
```

- Check a full working example [here](https://github.com/wxrayut/asteris.js/blob/main/example/a.ts).

## 📜 License

This project is licensed under the [MIT License](https://github.com/wxrayut/asteris.js/blob/main/LICENSE).
