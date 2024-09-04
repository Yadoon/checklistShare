const express = require('express');
const router = express.Router();
const {getOrCreateDoc} = require('../controller/componentsController');

router.post('/get-or-create-doc', async (req, res) => {
    try {
        await getOrCreateDoc(req, res);
    } catch (error) {
        res.status(500).json({code: 1, msg: "internal error", error: error.message});
    }
});


router.get('/health', async (req, res) => {
    try {
        res.status(200).json();
    } catch (error) {
        res.status(500).json({code: 1, msg: "internal error", error: error.message});
    }
});

module.exports = router;
