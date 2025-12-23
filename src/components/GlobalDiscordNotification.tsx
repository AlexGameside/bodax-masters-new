import React, { useState, useEffect } from 'react';
import { AlertTriangle, MessageCircle, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GlobalDiscordNotificationProps {
  discordLinked: boolean;
  inDiscordServer: boolean;
}

const DISCORD_INVITE = 'https://discord.gg/MZzEyX3peN';

const GlobalDiscordNotification: React.FC<GlobalDiscordNotificationProps> = () => {
  return null;
};

export default GlobalDiscordNotification; 