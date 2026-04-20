export type LeadTag = "hot" | "warm" | "cold";
export type MessageStatus = "sent" | "delivered" | "read";
export type MessageSender = "user" | "lead" | "ai";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  tag: LeadTag;
  score: number;
  source: string;
  value: string;
  stage: string;
  online: boolean;
  assignedTo?: string;
};

export type Message = {
  id: string;
  sender: MessageSender;
  text: string;
  time: string;
  status?: MessageStatus;
};

export type Conversation = {
  id: string;
  lead: Lead;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
};

export const conversations: Conversation[] = [
  {
    id: "1",
    lead: { id: "1", name: "Priya Sharma", phone: "+91 98765 43210", email: "priya@acme.co", avatar: "PS", tag: "hot", score: 96, source: "Facebook Ads", value: "₹12,499", stage: "Closing", online: true },
    lastMessage: "Yes, I'm interested in the premium plan!",
    lastTime: "Just now",
    unread: 3,
    messages: [
      { id: "m1", sender: "user", text: "Hi Priya! 👋 Thanks for reaching out about our premium services.", time: "10:30 AM", status: "read" },
      { id: "m2", sender: "lead", text: "Hi! I saw your ad on Facebook. Can you tell me more about the pricing?", time: "10:32 AM" },
      { id: "m3", sender: "user", text: "Of course! Our Premium plan is ₹12,499/month and includes:\n\n✅ Unlimited WhatsApp campaigns\n✅ AI-powered auto-replies\n✅ Lead scoring & pipeline\n✅ Priority support\n\nWould you like a demo?", time: "10:33 AM", status: "read" },
      { id: "m4", sender: "lead", text: "That sounds great! What's the setup process like?", time: "10:35 AM" },
      { id: "m5", sender: "user", text: "Very simple — takes just 10 minutes. We'll connect your WhatsApp Business API and import your contacts. Our team handles everything.", time: "10:36 AM", status: "read" },
      { id: "m6", sender: "lead", text: "Yes, I'm interested in the premium plan!", time: "10:38 AM" },
    ],
  },
  {
    id: "2",
    lead: { id: "2", name: "Rohit Verma", phone: "+91 99876 54321", avatar: "RV", tag: "hot", score: 91, source: "Instagram", value: "₹4,999", stage: "Qualification", online: false },
    lastMessage: "Can you share a case study?",
    lastTime: "5m ago",
    unread: 1,
    messages: [
      { id: "m7", sender: "lead", text: "Hey, I found you through Instagram. Interested in WhatsApp marketing.", time: "9:45 AM" },
      { id: "m8", sender: "user", text: "Hi Rohit! Great to hear. What kind of business do you run?", time: "9:47 AM", status: "read" },
      { id: "m9", sender: "lead", text: "I run an e-commerce store for electronics. Around 5000 orders/month.", time: "9:50 AM" },
      { id: "m10", sender: "user", text: "Perfect fit! Many e-commerce brands use us. Want me to send a case study?", time: "9:52 AM", status: "delivered" },
      { id: "m11", sender: "lead", text: "Can you share a case study?", time: "10:01 AM" },
    ],
  },
  {
    id: "3",
    lead: { id: "3", name: "Anjali Mehta", phone: "+91 90123 45678", email: "anjali@pixel.io", avatar: "AM", tag: "warm", score: 74, source: "Google Ads", value: "₹2,499", stage: "Pitch", online: true },
    lastMessage: "Let me think about it and get back to you",
    lastTime: "32m ago",
    unread: 0,
    messages: [
      { id: "m12", sender: "user", text: "Hi Anjali! Following up on our conversation about the Starter plan.", time: "9:00 AM", status: "read" },
      { id: "m13", sender: "lead", text: "Hi! Yes, I've been looking at it. Is there a trial?", time: "9:15 AM" },
      { id: "m14", sender: "user", text: "We offer a 7-day free trial with full access. No credit card required! 🎉", time: "9:16 AM", status: "read" },
      { id: "m15", sender: "lead", text: "Let me think about it and get back to you", time: "9:30 AM" },
    ],
  },
  {
    id: "4",
    lead: { id: "4", name: "Karan Singh", phone: "+91 88765 43210", avatar: "KS", tag: "warm", score: 68, source: "Referral", value: "₹4,999", stage: "Qualification", online: false },
    lastMessage: "How does it compare to WATI?",
    lastTime: "1h ago",
    unread: 0,
    messages: [
      { id: "m16", sender: "lead", text: "My friend Rahul recommended your platform. How does it compare to WATI?", time: "8:30 AM" },
      { id: "m17", sender: "user", text: "Great question! Key differences:\n\n🤖 Built-in AI sales assistant\n📊 Revenue tracking per lead\n⚡ Faster automation\n💰 Better pricing\n\nWant a side-by-side comparison?", time: "8:35 AM", status: "read" },
      { id: "m18", sender: "lead", text: "How does it compare to WATI?", time: "9:00 AM" },
    ],
  },
  {
    id: "5",
    lead: { id: "5", name: "Sneha Reddy", phone: "+91 97654 32100", avatar: "SR", tag: "cold", score: 42, source: "Website", value: "₹999", stage: "Greeting", online: false },
    lastMessage: "Just checking pricing",
    lastTime: "3h ago",
    unread: 0,
    messages: [
      { id: "m19", sender: "lead", text: "Just checking pricing", time: "7:00 AM" },
      { id: "m20", sender: "user", text: "Hi Sneha! Here are our plans:\n\n🟢 Starter: ₹999/mo\n🔵 Growth: ₹2,499/mo\n🟣 Premium: ₹12,499/mo\n\nWhich one interests you?", time: "7:05 AM", status: "delivered" },
    ],
  },
  {
    id: "6",
    lead: { id: "6", name: "Arjun Kapoor", phone: "+91 91234 56789", avatar: "AK", tag: "hot", score: 88, source: "Facebook Ads", value: "₹4,999", stage: "Objection", online: true },
    lastMessage: "Your pricing is a bit high compared to others",
    lastTime: "2h ago",
    unread: 2,
    messages: [
      { id: "m21", sender: "lead", text: "Your pricing is a bit high compared to others", time: "8:00 AM" },
      { id: "m22", sender: "user", text: "I understand the concern! But consider: our AI alone saves you 15+ hours/week. Plus, the ROI is typically 5x within the first month.", time: "8:05 AM", status: "read" },
    ],
  },
];
