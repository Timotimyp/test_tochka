import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### 11. **.gitignore**
```
node_modules
dist
.DS_Store
*.log