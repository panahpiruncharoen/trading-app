# Trading-app
This app is made for people in need. The main function of this website is 
1. trading - One user proposes an exchange, specifying what they have to give and what they want in return. Another user can then accept the trade. Both sides will then perform the exchange in real life.
2. giving - One user lists some things they want to give away. Another user can then accept the donation, and the giver will send the things to them in real life.
3. receiving - One user requests some things they need. Another user can then accept the request, and send the requested items to them in real life.

# Development Environment
Conda environment named "websites"

# UI library
shadcn: https://ui.shadcn.com

# Firestore Database Schema

## Collections: users

Path: /users/{uid}

Fields:
- country: string
- createdAt: timestamp
- email: string
- firstName: string
- lastName: string
- phoneNumber: string

### Subcollection: blocked

Path: /users/{uid}/blocked/{blockedUid}

Users that {uid} has blocked from sending them messages.

Fields:
- createdAt: timestamp

## Collections: rateLimits

Path: /rateLimits/{uid}

Written in the same batch as every chat message; the rules reject a message sent less than 2 seconds after the previous one.

Fields:
- lastMessageAt: timestamp

## Collections: posts

Path: /posts/{postId}

Fields:
- content: string
- timestamp: timestamp
- title: string
- uid: string
- type: string ("exchange", "donation", "request")
- images: array[string] (image storage paths, max size = 5)

## Collections: chats

Path: /chats/{messageId}

chatId is constructed from a sorted concatenation of two uid, so that each chatId can uniquely identify a conversation between 2 unique users.

Fields:
- chatId: string
- timestamp: timestamp
- content: string
- from: string (uid of the sender)
- to: string (uid of the receiver)

# Image storage path pattern
images/{uid}/posts/{postId}/{index}
Notes: maximum images per post is 5. Files are named by their index (0-4), which is how storage.rules enforces the limit.
