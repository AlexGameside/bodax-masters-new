# Unity League Tournament Platform

Unity League is a tournament management platform built for Valorant esports. We use Riot's match, account, and competitive APIs to create a comprehensive tournament system that handles everything from team registration to live streaming.

Our platform features an intelligent Swiss system that automatically pairs teams based on their current standings, ensuring fair matchups throughout the tournament. Teams negotiate match times within flexible scheduling windows, with built-in spam protection to prevent duplicate proposals.

The standout feature is our custom streaming overlay system. Streamers get real-time tournament overlays that display live match data, team rosters, map bans, and match states. These overlays integrate seamlessly with OBS and other streaming software, giving broadcasts a professional esports look.

We've integrated Discord OAuth for user authentication and notifications, making it easy for gaming communities to manage tournaments directly from their Discord servers. The platform handles everything from bracket generation to result submission, reducing the administrative burden on tournament organizers.

The APIs we use include Riot's match data for player statistics, account information for team verification, and competitive data for tournament management. Our Discord integration handles user authentication and tournament notifications, while Firebase powers our real-time database and live updates.
