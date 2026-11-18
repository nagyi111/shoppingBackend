//Nagy Dominik

import express from 'express'
import mysql from 'mysql2/promise'
import { myConfig } from './configDB.js'


const app = express()
app.use(express.json())

let connection

try {
    connection = mysql.createPool(myConfig)
    //egy teszt mert a connectionPool() csak létrehozza a pool objektumot, de nem ellenőrzni hogy létezike az adatbázis
    await connection.execute('select 1')
    console.log('Sikeres adatbázis kapcsolódás....');

} catch (error) {
    console.log('HIBAAAAAA', error);
    process.exit(1)//leállítja a programot mert az alkalmazás nem tudja megnyitni az adatbázist
}

//1. FELADAT pipa

app.get('/categories', async (req, resp) => {
    try {
        const sql = `SELECT categories.name, categories.id
        FROM categories
        ORDER BY categories.name;
                            `
        const [rows] = await connection.execute(sql)
        resp.status(200).send(rows)
    } catch (error) {
        console.log(error);
        resp.status(500).json({ msg: 'Hiba!!!!' })
    }
})

//2. FELADAT

app.get('/products', async (req, resp) => {
    try {
        const sql = `SELECT products.*, categories.name
        FROM products, categories
        WHERE products.category_id = categories.id
        ORDER BY products.title
                            `
        const [rows] = await connection.execute(sql)
        resp.status(200).send(rows)
    } catch (error) {
        console.log(error);
        resp.status(500).json({ msg: 'Hiba!!!!' })
    }
})

//3. FELADAT

app.get('/products/:categId', async (req, resp) => {
    const { categId } = req.params

    try {
        const sql = `
            SELECT products.*, categories.name AS category_name
            FROM products, categories
            WHERE products.category_id = categories.id
            AND categories.id = ?
        `
        const [rows] = await connection.execute(sql, [categId])
        resp.status(200).send(rows)
    } catch (error) {
        console.log(error);
        resp.status(500).json({ msg: 'Hiba!!!!' })
    }
})

//4. FELADAT

app.get('/cart', async (req, resp) => {
    const sql = `
            SELECT cart.product_id,
                   products.title,
                   cart.quantity,
                   products.price AS egysegar
            FROM cart, products
            WHERE cart.product_id = products.id
        `
    try {

        const [rows] = await connection.execute(sql)
        resp.status(200).send(rows)
    } catch (error) {
        console.log(error);
        resp.status(500).json({ msg: 'Hiba!!!!' })
    }
})

//5. FELADAT

app.post('/cart', async (req, resp) => {
    const { productId, quantity } = req.body

    try {
        let sql = `
            SELECT cart.product_id, cart.quantity
            FROM cart
            WHERE cart.product_id = ?
        `

        const [result] = await connection.execute(sql, [productId])

        if (result.length > 0) {
            // A termék már szerepel a kosárban
            sql = `
                UPDATE cart
                SET quantity = quantity + ?
                WHERE product_id = ?
            `

            await connection.execute(sql, [quantity, productId])

            resp.status(200).json({
                msg: "Sikeresen növeltük a mennyiséget!"
            })

        } else {
            // A termék még nem szerepel a kosárban
            sql = `
                INSERT INTO cart (product_id, quantity)
                VALUES (?, ?)
            `

            await connection.execute(sql, [productId, quantity])

            resp.status(201).json({
                msg: "Sikeresen hozzáadtuk a terméket!"
            })
        }

    } catch (error) {
        console.log(error)
        resp.status(500).json({ msg: "Hiba!!!!" })
    }
})

//6. FELADAT

app.patch('/cart/:product_id', async (req, resp) => {
    const { change } = req.body
    const { product_id } = req.params

    try {
        // 1. Tiltott negatív változás
        if (!Number.isInteger(change) || change < -1) {
            return resp.status(400).json({
                msg: "Érvénytelen mennyiségváltozás!"
            })
        }

        // 2. Meglévő mennyiség lekérdezése
        let sql = `
            SELECT quantity
            FROM cart
            WHERE product_id = ?
        `

        const [rows] = await connection.execute(sql, [product_id])

        if (rows.length === 0) {
            return resp.status(404).json({
                msg: "A termék nincs a kosárban!"
            })
        }

        // 3. Új mennyiség kiszámítása
        const ujMennyiseg = rows[0].quantity + change

        if (ujMennyiseg < 0) {
            return resp.status(400).json({
                msg: "A mennyiség nem lehet negatív!"
            })
        }

        // 4. Ha 0, töröljük
        if (ujMennyiseg === 0) {
            sql = `DELETE FROM cart WHERE product_id = ?`

            await connection.execute(sql, [product_id])

            return resp.status(200).json({
                msg: "Termék törölve a kosárból!"
            })
        }

        // 5. Ha pozitív, módosítjuk
        sql = `
            UPDATE cart
            SET quantity = ?
            WHERE product_id = ?
        `

        await connection.execute(sql, [ujMennyiseg, product_id])

        resp.status(200).json({
            msg: "Sikeres mennyiségmódosítás!"
        })

    } catch (error) {
        console.log(error)
        resp.status(500).json({
            msg: "Szerverhiba történt!"
        })
    }
})
//7. FELADAT

app.delete('/cart/:product_id', async (req, resp) => {
    const { product_id } = req.params

    try {
        const sql = `
            DELETE FROM cart
            WHERE product_id = ?
        `
        const [rows] = await connection.execute(sql, [product_id])
        console.log(rows, rows.affectedRows);
        resp.status(200).json({ msg: 'Sikeres törlés!' })


    } catch (error) {
        console.log(error);
        resp.status(500).json({ msg: 'Hiba!!!!' })
    }
})

//8. FELADAT

app.delete('/cart', async (req, resp) => {

    try {
        const sql = `DELETE
        FROM cart`
        const [rows] = await connection.execute(sql)
        console.log(rows, rows.affectedRows);
        resp.status(200).json({ msg: 'Sikeres törlés!' })


    } catch (error) {
        console.log(error);
        resp.status(500).json({ msg: 'Hiba!!!!' })

    }
})

//9. FELADAT

app.get('/cart/total', async (req, resp) => {

    try {
        const sql = `SELECT SUM(products.price * cart.quantity) AS vegosszeg 
        FROM cart, products 
        WHERE products.id = cart.product_id;`
        const [rows] = await connection.execute(sql)
        resp.status(200).send(rows)
    } catch (error) {
        console.log(error);
        resp.status(500).json({ msg: 'Hiba!!!!' })
    }
})


const port = 8000
app.listen(port, () => console.log(`Server listening on port: ${port}...`))


