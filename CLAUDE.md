# Trading-app
This app is made for people in need. The main function of this website is 
1. trading - One user proposes an exchange, specifying what they have to give and what they want in return. Another user can then accept the trade. Both sides will then perform the exchange in real life.
2. giving - One user lists some things they want to give away. Another user can then accept the donation, and the giver will send the things to them in real life.
3. receiving - One user requests some things they need. Another user can then accept the request, and send the requested items to them in real life.

# workflow
1. trading
    1. A user creates an exchange post specifying what they offer and what they want in return.
    2. Another user sends an exchange proposal.
    3. The post owner accepts or rejects the proposal.
    4. If accepted, the agreed quantities are reserved and both users can communicate through chat.
    5. Both users arrange the exchange and upload proof that they sent and received the items.
    6. Both users confirm that the exchange is complete.
    7. If either user reports that the exchange failed, the transaction is cancelled and the reserved quantities are restored.
    8. If either user blocks the other, the system prevents further messages. Any active exchange follows the cancellation process.
2. giving
    1. A user creates a donation post specifying the items and quantities they want to give away.
    2. Another user requests the donation.
    3. The giver accepts or rejects the request.
    4. If accepted, the agreed quantity is reserved and both users can communicate through chat.
    5. The giver sends the items and uploads proof. The recipient uploads proof of receiving them.
    6. Both users confirm that the donation is complete.
    7. If the donation fails, the transaction is cancelled and the reserved quantity is restored.
    8. If either user blocks the other, the system prevents further messages. Any active donation follows the cancellation process.
3. recieving
    1. A user creates a request post specifying the items and quantities they need.
    2. Another user offers to provide the requested items.
    3. The requester accepts or rejects the offer.
    4. If accepted, the agreed quantity is reserved and both users can communicate through chat.
    5. The provider sends the items and uploads proof. The requester uploads proof of receiving them.
    6. Both users confirm that the request is complete.
    7. If the request fails, the transaction is cancelled and the reserved quantity is restored.
    8. If either user blocks the other, the system prevents further messages. Any active request follows the cancellation process.
4. Special Case Disputes
    1. If one user confirms completion but the other reports a problem, the transaction enters a disputed state.
    2. Both users can submit their proof for review.
    3. The system keeps the items reserved until the dispute is resolved.
    4. If the transaction is verified as complete, the system finalizes it.
    5. If the transaction is verified as unsuccessful, the system cancels it and restores the reserved quantities.
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
