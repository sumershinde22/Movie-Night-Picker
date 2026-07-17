Project 2 Name: Movie Night Picker

Team Members:
@Sumer Shinde
@Catherine Han

Description:
Movie Night Picker is a full-stack web app that solves the "what should we watch tonight?" problem. Instead of just tracking movies solo, users build a personal watchlist tagged with mood, genre, and streaming platform, then start a "Movie Night Session" and invite friends to vote on candidates pulled from everyone's lists. If the group can't agree, a weighted random-spin picker breaks the tie. It's part personal tracker, part group decision-making tool.

User Personas:
The Host: A person organizing movie night who wants to gather candidate movies from the group and land on a final pick without an hour of back-and-forth debate.
The Voter: A friend joining someone else's movie night who wants an easy, fun way (swiping/voting) to weigh in on what the group watches, without having to dig through streaming apps themselves.

User Stories:
US-01: Profile & Watchlist Management (CRUD)
As a user, I want to create a profile and manage my personal movie watchlist (adding, editing, removing entries), so that I have a ready pool of movies to pull from for movie nights. Each movie entry stores a title, genre, mood tags ("cozy," "intense," "background noise"), runtime, streaming platform, and a watched flag.
US-02: Create a Movie Night Session
As a host, I want to start a session, invite friends by username, and pull candidate movies from my own watchlist or theirs, so that the group has a shared shortlist to choose from instead of starting from scratch. I can set a mood filter ("something short," "horror night") to narrow the candidate pool automatically.
US-03: Swipe & Vote on Candidates
As a voter, I want to swipe yes/no or rate each candidate movie in an active session, so that I can quickly express my preference without a group chat debate. Live vote tallies update for everyone in the session in real time.
US-04: Random Picker Wheel (Tiebreaker)
As a host, I want to spin a weighted random picker when votes are tied or inconclusive, so that the group still walks away with a decision instead of arguing about it. Movies with more votes get a larger slice of the wheel, so the pick is random but not unfair.
The three MongoDB collections are Users (storing user info and their personal watchlist), Movies (storing movie info: title, genre, mood tags, runtime, platform), and Sessions (storing a movie night session: host, invited participants, candidate movie references, votes per participant, and the final winning pick). US-01 handles full CRUD across Users and Movies. US-02 creates a new Sessions document and populates it with references to Movies. US-03 is a targeted update on a single Sessions document (appending/updating votes). US-04 reads vote tallies from a Sessions document, runs the weighted selection client-side, and writes the final pick back to that same document.

Design Mockups:
LOGGED IN NAVBAR:
[LOGO][MY WATCHLIST LINK][MOVIE NIGHTS LINK] --- empty space --- [LOG OUT BUTTON]

LOGIN/SIGNUP VIEW:
[A CENTRALIZED COMPONENT TO LOG IN OR SIGN UP]

MY WATCHLIST VIEW:
[A FORM TO ADD/EDIT A MOVIE]
[A LIST OF MOVIES THE USER HAS ADDED]

MOVIE NIGHTS VIEW:
[A FORM TO CREATE A NEW MOVIE NIGHT]
[A LIST OF THE USER'S MOVIE NIGHT HISTORY]

MOVIE NIGHT VIEW:
[A CARD FOR VOTING ON A SPECIFIC MOVIE, WITH A YES AND NO BUTTON][A LIST OF THE LIVE VOTE TALLIES]
[A STATUS COMPONENT SHOWING THE CURRENT STATE OF THE MOVIE NIGHT]
[A WHEEL THAT ONLY SHOWS UP IF THE MOVIE NIGHT OWNER WISHES TO DO A TIEBREAKER]

Tech Stack:
Frontend: React (client-side rendering)
Backend: Node.js + Express
Database: MongoDB
Data Requests: Fetch API

Cool Features:
Weighted random-spin wheel for tiebreaking, with a spin animation
Mood-based filtering ("cozy," "scary," "background noise") instead of just genre
Streaming platform tags so the group knows instantly where a pick is watchable
Live vote tallies during an active session so everyone sees results update in real time
Movie night history log that has past sessions, who was there, and what won

Work Distribution:
@Sumer Shinde: US-01 and US-02 (personal watchlist CRUD and creating/configuring movie night sessions)
@Catherine Han: US-03 and US-04 (voting/swiping mechanics and the random picker wheel tiebreaker)
