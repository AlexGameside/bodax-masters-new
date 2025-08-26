# Unity League Design System

## 🎨 **Color Palette**

### **Primary Colors**
- **Hot Pink/Magenta**: `from-pink-500 via-magenta-600 to-purple-700`
- **Cyan/Blue**: `from-cyan-500 to-blue-600`
- **Black**: `bg-black/60` (semi-transparent)

### **Accent Colors**
- **Cyan**: `text-cyan-400`, `bg-cyan-500`
- **Pink**: `text-pink-200`, `border-pink-400/30`
- **Purple**: `text-purple-400`, `bg-purple-500`
- **White**: `text-white`

### **Background Patterns**
```css
backgroundImage: `
  linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%),
  linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%),
  radial-gradient(circle at 25% 25%, rgba(0,255,255,0.1) 0 1px, transparent 1px 100px),
  radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0 1px, transparent 1px 100px)
`
```

### **Diagonal Accent Lines**
- **Cyan lines**: `bg-cyan-400` with `transform rotate-45`
- **White lines**: `bg-white` with `transform rotate-45`

## 🎭 **Component Styles**

### **Cards/Containers**
```css
bg-black/60 border border-pink-400/30 rounded-2xl shadow-2xl backdrop-blur-sm
```

### **Buttons**
- **Primary**: `bg-gradient-to-r from-cyan-500 to-blue-600 text-black`
- **Secondary**: `bg-black/60 border border-pink-400/30 text-white`
- **Hover states**: `hover:from-cyan-600 hover:to-blue-700`

### **Form Elements**
```css
bg-black/40 border border-pink-400/30 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400
```

### **Text Hierarchy**
- **Headings**: `text-white font-bold`
- **Body**: `text-pink-200`
- **Accents**: `text-cyan-400`
- **Secondary**: `text-pink-100`

## 🏗️ **Layout Patterns**

### **Page Structure**
```jsx
<div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700 text-white font-sans relative overflow-hidden">
  {/* Background Pattern */}
  <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{backgroundImage: `...`}} />
  
  {/* Diagonal Accents */}
  <div className="absolute inset-0 z-0 pointer-events-none">
    <div className="absolute top-0 right-0 w-32 h-1 bg-cyan-400 transform rotate-45 origin-top-right"></div>
    {/* More diagonal lines */}
  </div>
  
  {/* Content */}
  <div className="relative z-20">
    {/* Page content */}
  </div>
</div>
```

### **Section Patterns**
```jsx
<section className="py-20 bg-black/40">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
        <Icon className="w-8 h-8 text-cyan-400 inline mr-3" />
        Section Title
      </h2>
      <p className="text-lg text-pink-200 max-w-2xl mx-auto">
        Section description
      </p>
    </div>
    
    {/* Section content */}
  </div>
</section>
```

## 📱 **Responsive Design**

### **Container Classes**
- **Small**: `max-w-md mx-4`
- **Medium**: `max-w-4xl mx-auto px-4 sm:px-6 lg:px-8`
- **Large**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

### **Grid Systems**
- **1 Column**: `grid-cols-1`
- **2 Columns**: `md:grid-cols-2`
- **3 Columns**: `md:grid-cols-2 lg:grid-cols-3`
- **4 Columns**: `md:grid-cols-2 lg:grid-cols-4`

## 🎯 **Page-Specific Guidelines**

### **Landing Page** ✅
- Hero section with Unity League branding
- Tournament format explanation
- Location & venue details
- Timeline & registration

### **Authentication Pages** ✅
- UserLogin: Updated to Unity League design
- UserRegistration: Next to update
- Clean forms with Unity League styling

### **Dashboard Pages** (To Update)
- UserDashboard: Main user interface
- AdminPanel: Administrative controls
- Profile: User profile management

### **Tournament Pages** (To Update)
- TournamentList: Browse tournaments
- TournamentDetail: Individual tournament view
- TournamentCreation: Create new tournaments
- TournamentManagement: Manage existing tournaments

### **Team Pages** (To Update)
- TeamManagement: Team administration
- CreateTeam: Team creation interface
- TeamRegistration: Team signup process

### **Legal/Info Pages** (To Update)
- PrivacyPolicy, TermsOfService, GDPR
- FAQ, HelpCenter, ContactUs
- CookiePolicy, TournamentRules

## 🔄 **Update Process**

1. **Background**: Change to Unity League gradient
2. **Patterns**: Add geometric background patterns
3. **Accents**: Add diagonal cyan/white lines
4. **Colors**: Update all colors to match palette
5. **Components**: Apply consistent card/button styles
6. **Typography**: Update text hierarchy
7. **Spacing**: Maintain consistent padding/margins

## 📋 **Priority Order**

### **High Priority** (User-facing)
1. ✅ LandingPage
2. ✅ UserLogin
3. UserRegistration
4. UserDashboard
5. TournamentList
6. TournamentDetail

### **Medium Priority** (Functional)
7. AdminPanel
8. TeamManagement
9. CreateTeam
10. MatchPage

### **Low Priority** (Informational)
11. Legal pages
12. Help/FAQ pages
13. Contact pages

## 🎨 **Design Principles**

1. **Consistency**: All pages follow the same design language
2. **Unity**: Brand colors and patterns throughout
3. **Modern**: Clean, professional aesthetic
4. **Accessible**: High contrast and readable text
5. **Responsive**: Works on all device sizes
6. **Performance**: Optimized for fast loading

---

**Next Steps**: Systematically update each page following this design system, starting with high-priority user-facing pages. 