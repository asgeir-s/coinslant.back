import test from 'ava';
import * as sinon from 'sinon';

function initDatabase() {
    return require('./database').init({
        "DynamoDB": {
            "DocumentClient": function () {
                this.batchWrite = sinon.spy()
                this.scan = sinon.spy()
                this.get = sinon.spy()
            }
        }
    });
}
test('one plus one is two', t => {
    const database = initDatabase();
    database.getItem('coinslant-meta', {'coinName': "bitcoin"})
    t.true(database)

})