# What we are building next

TinyFloor is live on Cloudflare — Workers, Durable Objects, D1 and Realtime —
and the floor works. These documents are about the part that does not exist
yet: the office around it.

What has already shipped is described by the code and by git history, not here.

## The idea

- **An office is a floor.** One office, one room, two roles. Nobody creates
  rooms.
- **Membership is the seat.** Three members free; paid tiers hold more. An
  invitation is not a seat, and neither is being online.
- **The floor is a fifth of the product.** The rest is the shell around it:
  chat, people, settings, beside the map rather than on top of it.
- **A team cannot work in a room that forgets.** Channels and direct messages
  that persist, beside the transient chat on the floor.
- **Costs stay near zero by design**, not by luck: hibernating sockets, small
  messages, thumbnail-quality video, images compressed in the browser.

## The plan

| Document | What it covers |
|---|---|
| [01-app-shell.md](01-app-shell.md) | The rail, the views, the presence dock, what it is built from |
| [02-chat.md](02-chat.md) | Channels, direct messages, attachments, and what they cost |
| [03-offices-members-and-seats.md](03-offices-members-and-seats.md) | One office one floor, two roles, what a seat is |
| [04-costs.md](04-costs.md) | Measured usage, the prices we are charged, where money can go |
| [05-pricing.md](05-pricing.md) | The tiers, the free office, fair use on group video |
| [research/gather.md](research/gather.md) | Gather, looked at properly: what to take and what to leave |

## Order

1. The shell, with the floor moved inside it unchanged.
2. Offices, members and seats — the model the rest hangs off.
3. Chat, which is the reason the shell exists.
4. Billing, once the tiers are agreed.
