import PokerHand from "poker-hand-evaluator";

export default class Poker {

    static SUITS = ['D', 'H', 'C', 'S']
    static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

    static findHighest(cards) {
        cards.sort((a, b) => Poker.RANKS.indexOf(b.rank) - Poker.RANKS.indexOf(a.rank)
            || Poker.SUITS.indexOf(b.suit) - Poker.SUITS.indexOf(a.suit));
        return cards[0];
    }

    static evaluate(cards) {
        const tmp = cards.reduce((str, card) => {
            return (str ? (str + " ") : "") + card.rank + card.suit;
        });
        console.log(tmp);
        return new PokerHand(tmp).describe();
    }
}
