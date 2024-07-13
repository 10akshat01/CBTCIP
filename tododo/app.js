require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const date = require(__dirname + "/date.js");
const _ = require("lodash");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
 
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.error("Error connecting to MongoDB:", err);
});

const itemsSchema = new mongoose.Schema({
    name: String
});

const Item = mongoose.model("Item", itemsSchema);

const completedItemsSchema = new mongoose.Schema({
    name: String
});

const CompletedItem = mongoose.model("CompletedItem", completedItemsSchema);

const item1 = new Item({ name: "todo1" });
const item2 = new Item({ name: "todo2" });
const item3 = new Item({ name: "todo3" });

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

app.get("/", async (req, res) => {
    const day = date.getDate();

    try {
        let foundItems = await Item.find({});
        if (foundItems.length === 0) {
            await Item.insertMany(defaultItems);
            res.redirect("/");
        } else {
            res.render("list", { listTitle: day, newlistItems: foundItems });
        }
    } catch (err) {
        console.error(err);
    }
});

app.get("/completed", async (req, res) => {
    try {
        const completedItems = await CompletedItem.find({});
        res.render("completed", { listTitle: "Completed Tasks", completedItems: completedItems });
    } catch (err) {
        console.error(err);
    }
});

app.get("/:customListName", async (req, res) => {
    const customListName = _.capitalize(req.params.customListName);

    try {
        const foundList = await List.findOne({ name: customListName });

        if (!foundList) {
            const list = new List({
                name: customListName,
                items: defaultItems
            });

            await list.save();
            res.redirect("/" + customListName);
        } else {
            res.render("list", { listTitle: foundList.name, newlistItems: foundList.items });
        }
    } catch (err) {
        console.error(err);
    }
});

app.post("/", async (req, res) => {
    const day = date.getDate();
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({ name: itemName });

    try {
        if (listName === day) {
            await item.save();
            res.redirect("/");
        } else {
            const foundList = await List.findOne({ name: listName });

            foundList.items.push(item);
            await foundList.save();
            res.redirect("/" + listName);
        }
    } catch (err) {
        console.error(err);
    }
});

app.post("/delete", async (req, res) => {
    const day = date.getDate();
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    try {
        if (listName === day) {
            const item = await Item.findById(checkedItemId);
            const completedItem = new CompletedItem({ name: item.name });
            await completedItem.save();
            await Item.findByIdAndRemove(checkedItemId);
            res.redirect("/");
        } else {
            const list = await List.findOne({ name: listName });
            const item = list.items.id(checkedItemId);
            const completedItem = new CompletedItem({ name: item.name });
            await completedItem.save();
            await List.findOneAndUpdate(
                { name: listName },
                { $pull: { items: { _id: checkedItemId } } }
            );
            res.redirect("/" + listName);
        }
    } catch (err) {
        console.error(err);
    }
});

app.listen(5000, () => {
    console.log('Server started on port 5000');
});
