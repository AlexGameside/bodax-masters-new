import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  doc, 
  query, 
  orderBy,
  Timestamp,
  where,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Ticket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  type: 'general' | 'dispute' | 'support';
  status: 'open' | 'claimed' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  claimedBy?: string;
  claimedAt?: Date;
  closedBy?: string;
  closedAt?: Date;
  matchInfo?: {
    team1: string;
    team2: string;
    map?: string;
    phase?: string;
  };
  responses: TicketResponse[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface TicketResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  message: string;
  createdAt: Date;
}

export interface CreateTicketRequest {
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  ticketType?: 'general' | 'dispute' | 'support';
  matchInfo?: {
    team1: string;
    team2: string;
    map?: string;
    phase?: string;
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CreateResponseRequest {
  ticketId: string;
  userId: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  message: string;
}

// ===== TICKET MANAGEMENT =====

/**
 * Create a new support ticket
 */
export const createTicket = async (request: CreateTicketRequest): Promise<Ticket> => {
  try {
    const ticketData = {
      userId: request.userId,
      userEmail: request.userEmail,
      userName: request.userName,
      subject: request.subject,
      description: request.description,
      type: request.ticketType || 'general',
      status: 'open' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      responses: [],
      priority: request.priority || 'medium',
      ...(request.matchInfo && { matchInfo: request.matchInfo })
    };

    const docRef = await addDoc(collection(db, 'tickets'), ticketData);
    
    // Get the created document to return with ID
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Failed to create ticket');
    }

    const result = {
      id: docRef.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date()
    } as Ticket;
    
    return result;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

/**
 * Get all tickets (admin only)
 */
export const getAllTickets = async (): Promise<Ticket[]> => {
  try {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const ticket = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        claimedAt: data.claimedAt?.toDate(),
        closedAt: data.closedAt?.toDate(),
        responses: data.responses?.map((response: any) => ({
          ...response,
          createdAt: response.createdAt?.toDate() || new Date()
        })) || []
      } as Ticket;
      
      // Apply filtering - admins will get full data, others will get filtered data
      return filterSensitiveData(ticket, true, '');
    });
  } catch (error) {
    console.error('Error getting all tickets:', error);
    throw error;
  }
};

/**
 * Get tickets for a specific user
 */
export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
  try {
    const q = query(
      collection(db, 'tickets'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const ticket = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        claimedAt: data.claimedAt?.toDate(),
        closedAt: data.closedAt?.toDate(),
        responses: data.responses?.map((response: any) => ({
          ...response,
          createdAt: response.createdAt?.toDate() || new Date()
        })) || []
      } as Ticket;
      
      // Filter sensitive data for normal users
      return filterSensitiveData(ticket, false, userId);
    }).filter(ticket => ticket !== null) as Ticket[];
  } catch (error) {
    console.error('Error getting user tickets:', error);
    throw error;
  }
};

/**
 * Get a specific ticket by ID
 */
export const getTicket = async (ticketId: string, isAdmin: boolean = false, currentUserId: string = ''): Promise<Ticket | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'tickets', ticketId));
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    const ticket = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      claimedAt: data.claimedAt?.toDate(),
      closedAt: data.closedAt?.toDate(),
      responses: data.responses?.map((response: any) => ({
        ...response,
        createdAt: response.createdAt?.toDate() || new Date()
      })) || []
    } as Ticket;
    
    // Filter sensitive data based on user permissions
    return filterSensitiveData(ticket, isAdmin, currentUserId);
  } catch (error) {
    console.error('Error getting ticket:', error);
    throw error;
  }
};

/**
 * Add a response to a ticket
 */
export const addTicketResponse = async (request: CreateResponseRequest): Promise<Ticket> => {
  try {
    const ticketRef = doc(db, 'tickets', request.ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
      throw new Error('Ticket not found');
    }

    const ticketData = ticketSnap.data();
    const newResponse: TicketResponse = {
      id: Date.now().toString(),
      userId: request.userId,
      userName: request.userName,
      userEmail: request.userEmail,
      isAdmin: request.isAdmin,
      message: request.message,
      createdAt: new Date()
    };

    const updatedResponses = [...(ticketData.responses || []), newResponse];
    
    await updateDoc(ticketRef, {
      responses: updatedResponses,
      updatedAt: serverTimestamp()
    });

    // Return updated ticket
    const updatedSnap = await getDoc(ticketRef);
    const updatedData = updatedSnap.data();
    
    if (!updatedData) {
      throw new Error('Ticket not found after update');
    }
    
    return {
      id: updatedSnap.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      claimedAt: updatedData.claimedAt?.toDate(),
      closedAt: updatedData.closedAt?.toDate(),
      responses: updatedData.responses?.map((response: any) => ({
        ...response,
        createdAt: response.createdAt?.toDate() || new Date()
      })) || []
    } as Ticket;
  } catch (error) {
    console.error('Error adding ticket response:', error);
    throw error;
  }
};

/**
 * Claim a ticket (admin only)
 */
export const claimTicket = async (ticketId: string, adminId: string, adminName: string): Promise<Ticket> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    
    await updateDoc(ticketRef, {
      status: 'claimed',
      claimedBy: adminId,
      claimedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Return updated ticket
    const updatedSnap = await getDoc(ticketRef);
    const updatedData = updatedSnap.data();
    
    if (!updatedData) {
      throw new Error('Ticket not found after update');
    }
    
    return {
      id: updatedSnap.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      claimedAt: updatedData.claimedAt?.toDate(),
      closedAt: updatedData.closedAt?.toDate(),
      responses: updatedData.responses?.map((response: any) => ({
        ...response,
        createdAt: response.createdAt?.toDate() || new Date()
      })) || []
    } as Ticket;
  } catch (error) {
    console.error('Error claiming ticket:', error);
    throw error;
  }
};

/**
 * Close a ticket (admin only)
 */
export const closeTicket = async (ticketId: string, adminId: string, adminName: string): Promise<Ticket> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    
    await updateDoc(ticketRef, {
      status: 'closed',
      closedBy: adminId,
      closedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Return updated ticket
    const updatedSnap = await getDoc(ticketRef);
    const updatedData = updatedSnap.data();
    
    if (!updatedData) {
      throw new Error('Ticket not found after update');
    }
    
    return {
      id: updatedSnap.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      claimedAt: updatedData.claimedAt?.toDate(),
      closedAt: updatedData.closedAt?.toDate(),
      responses: updatedData.responses?.map((response: any) => ({
        ...response,
        createdAt: response.createdAt?.toDate() || new Date()
      })) || []
    } as Ticket;
  } catch (error) {
    console.error('Error closing ticket:', error);
    throw error;
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Check if user can create tickets
 */
export const canCreateTicket = (user: any): boolean => {
  return user && user.email;
};

/**
 * Format ticket type for display
 */
export const formatTicketType = (type: string): string => {
  const types = {
    general: 'General Support',
    dispute: 'Match Dispute',
    support: 'Technical Support',
  };
  return types[type as keyof typeof types] || type;
};

/**
 * Format ticket status for display
 */
export const formatTicketStatus = (status: string): { text: string; color: string } => {
  const statuses = {
    open: { text: '🟡 Open', color: 'text-yellow-400' },
    claimed: { text: '👤 Claimed', color: 'text-blue-400' },
    closed: { text: '🔒 Closed', color: 'text-red-400' },
  };
  return statuses[status as keyof typeof statuses] || { text: status, color: 'text-gray-400' };
};

/**
 * Get ticket priority based on type and status
 */
export const getTicketPriority = (ticket: Ticket): number => {
  let priority = 0;
  
  // Type priority
  if (ticket.type === 'dispute') priority += 10;
  else if (ticket.type === 'support') priority += 5;
  
  // Status priority
  if (ticket.status === 'claimed') priority += 3;
  else if (ticket.status === 'open') priority += 1;
  
  // Priority level
  if (ticket.priority === 'urgent') priority += 15;
  else if (ticket.priority === 'high') priority += 10;
  else if (ticket.priority === 'medium') priority += 5;
  
  return priority;
};

/**
 * Filter sensitive data from tickets based on user permissions
 */
const filterSensitiveData = (ticket: any, isAdmin: boolean, currentUserId: string): any => {
  if (isAdmin) {
    // Admins can see all data
    return ticket;
  }
  
  // For normal users, only show their own tickets and filter sensitive data
  if (ticket.userId === currentUserId) {
    // User can see their own ticket, but filter admin responses
    const filteredTicket = { ...ticket };
    if (filteredTicket.responses) {
      filteredTicket.responses = filteredTicket.responses.map((response: any) => {
        if (response.isAdmin) {
          // Remove sensitive data from admin responses for normal users
          return {
            id: response.id,
            userId: response.userId,
            userName: response.userName,
            isAdmin: response.isAdmin,
            message: response.message,
            createdAt: response.createdAt
            // userEmail is removed for security
          };
        }
        return response;
      });
    }
    return filteredTicket;
  }
  
  // User cannot see this ticket at all
  return null;
};

/**
 * Subscribe to ticket updates
 */
export const subscribeToTickets = (
  userId: string | null,
  isAdmin: boolean,
  callback: (tickets: Ticket[]) => void
) => {
  let q;
  
  if (isAdmin) {
    q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
  } else if (userId) {
    q = query(
      collection(db, 'tickets'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  } else {
    return () => {};
  }

  return onSnapshot(q, (querySnapshot) => {
    const tickets = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const ticket = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        claimedAt: data.claimedAt?.toDate(),
        closedAt: data.closedAt?.toDate(),
        responses: data.responses?.map((response: any) => ({
          ...response,
          createdAt: response.createdAt?.toDate() || new Date()
        })) || []
      } as Ticket;
      
      // Filter sensitive data based on user permissions
      return filterSensitiveData(ticket, isAdmin, userId || '');
    }).filter(ticket => ticket !== null) as Ticket[];
    
    callback(tickets);
  });
};

/**
 * Delete a ticket (admin only)
 */
export const deleteTicket = async (ticketId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'tickets', ticketId));
  } catch (error) {
    console.error('Error deleting ticket:', error);
    throw error;
  }
};
