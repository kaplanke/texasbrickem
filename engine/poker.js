export default class Poker {

    static SUITS = ['D', 'H', 'C', 'S']
    static RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    static evaluate(cards) {
        return {score: cards.length, rank: "Not implemented yet"};
    }
}
