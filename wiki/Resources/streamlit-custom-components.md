---
capture_id: 82068020-416d-4db0-9694-357c1f407249
links: []
para_category: Resources
summary: Streamlit custom components allow extending apps beyond built-in widgets
  with custom UI elements, offering better performance and multiple callbacks. The
  documentation covers V2 components, including backend and frontend implementation.
tags:
- streamlit
- custom-components
- api-reference
title: Streamlit Custom Components
---

## Introduction to Custom Components
Streamlit custom components extend your app beyond built-in widgets with custom UI elements. There are two versions of custom components: V1 and V2. V2 components offer better performance and multiple callbacks without iframes, while V1 components run in iframes with single callbacks.
## V2 Custom Components
### Backend (Python)
To register a custom component in Python, use the `st.components.v2.component` function, passing in your HTML and JS code.
```python
my_component = st.components.v2.component(html=HTML, js=JS)
my_component()
```
To mount a custom component, use the same function and call it.
```python
my_component = st.components.v2.component(html=HTML, js=JS)
my_component()
```
### Frontend (TypeScript)
For frontend implementation, you can use the `@streamlit/component-v2-lib` library. First, install it using npm:
```bash
npm i @streamlit/component-v2-lib
```
Then, import the necessary types and functions:
```typescript
import { FrontendRenderer } from '@streamlit/component-v2-lib';
import { FrontendRendererArgs } from '@streamlit/component-v2-lib';
```
