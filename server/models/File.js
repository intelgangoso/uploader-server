const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define Schema
let fileSchema = new Schema({
    userId: String,
    _id: mongoose.Schema.Types.ObjectId,
    avatar: {
        type: Array
    },
}, {
  collection: 'files'
})

module.exports = mongoose.model('File', fileSchema)
