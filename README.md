# PairingBot
Slack bot to track pairing stats of agile pair programming team via git commits.

## Bot integration details

- Create a slack custom integration for the bot ([Slack Bot](https://api.slack.com/custom-integrations)).
- Start the application with slack bot token.
- Invite the `PairingBot` to commit channel which is configured with incoming webhook from git.
- `PairingBot` listens to message from git webhooks and track pairing stats from commit message.
- Acceptable commit message samples
    - __`[StoryCardNumber] [Person1/Person2] commit message description`__
    - __`[StoryCardNumber] [Person1|Person2] commit message description`__
    - __`[StoryCardNumber] [Person1] commit message description`__
    - __`[Person1/Person2] commit message description`__
    - __`Person1/Person2: commit message description`__
    - __`Person1/Person2 - commit message description`__
- Get pairing information with the message `pairing stats?` as direct_message or with direct_mention to `@PairingBot`.
- Creare your team members list with `set member count` and `add member` commands.
- You can also do manual update to pairing matrix for the day with `add solo` and `add pair` commands.
- Works right out of the box, just keep calm and do pair programming.

## Supported messages

- `hello, hi`
- `list members`
- `set member count <count>`
- `add member <name>`
- `remove member <name>`
- `add solo <name>`
- `add pair <name1,name2>`
- `pairing stats?`
- `missing stats?`
- `uptime, who are you?`
- `bye, see you later, tata, ciao, adieu`

## Install and Setup instructions

After cloning the repository and running `npm install` or `yarn install` inside, you can use the following command to start the bot.

```sh
token=<slack-token> <npm start / yarn start>
```
*Pull requests are welcome!*

## Future extenstions
- Interactive conversations
- Graphical reports
- Pair switching reminders

## License

MIT