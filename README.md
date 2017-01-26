# PairingBot
Slack bot to track pairing stats of agile pair programming team via git commits.

## Bot integration details

- Create a slack custom integration for the bot ([Slack Bot](https://api.slack.com/custom-integrations)).
- Start the application with slack bot token.
- Invite the `PairingBot` to commit channel which is configured with incoming webhook from git.
- `PairingBot` listens to message from git webhooks and track pairing stats from commit message.
- acceptable commit message samples
-- __`[StoryCardNumber] [Person1/Person2] commit message description`__
-- __`[StoryCardNumber] [Person1] commit message description`__
-- __`[Person1/Person2] commit message description`__
-- __`[StoryCardNumber] Person1/Person2: commit message description`__
-- __`[StoryCardNumber] Person1/Person2 - commit message description`__
- get pairing information with the message `pairing stats?` as direct_message or with direct_mention to `@PairingBot`.
- Works right out of the box, just keep calm and do pair programming.


## Install and Setup instructions

After cloning the repository and running `npm install` inside, you can use the following command to start the bot.

```sh
token=<slack-token> npm start
```

*Pull requests are welcome!*

## Future extenstions
- Interactive conversations
- Graphical reports
- Pair switching reminders

## License

MIT