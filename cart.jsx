let products = [];

//=========Cart=============
const Cart = (props) => {
  const { Card, Accordion, Button } = ReactBootstrap;
  let data = props.location.data ? props.location.data : [];
  console.log(`data:${JSON.stringify(data)}`);

  return <Accordion defaultActiveKey="0">{list}</Accordion>;
};

const useDataApi = (initialUrl, cartStatus, initialData) => {
  const { useState, useEffect, useReducer } = React;
  const [url, setUrl] = useState(initialUrl);

  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: true,
    isError: false,
    haveData: false,
    data: initialData,
  });

  console.log(`useDataApi called`);
  useEffect(() => {
    console.log("useEffect Called");
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: "FETCH_INIT" });
      try {
        const result = await axios(url);
        console.log("FETCH FROM URl");
        if (!didCancel) {
          dispatch({ type: "FETCH_SUCCESS", payload: result.data.data });
          console.log(result.data.data)
        }
      } catch (error) {
        if (!didCancel) {
          dispatch({ type: "FETCH_FAILURE" });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [cartStatus, url]);
  return [state, setUrl];
};

const dataFetchReducer = (state, action) => {
  switch (action.type) {
    case "FETCH_INIT":
      return {
        ...state,
        isLoading: true,
        isError: false,
        haveData: false,
      };
    case "FETCH_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isError: false,
        haveData: true,
        data: action.payload,
      };
    case "FETCH_FAILURE":
      return {
        ...state,
        isLoading: false,
        isError: true,
        haveData: false,
      };
    default:
      throw new Error();
  }
};

const Products = (props) => {
  console.log(`Rendering the App`);
  let list = []
  const { Fragment, useState, useEffect, useReducer } = React;
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const {Card, Accordion, Button, Container, Row, Col, Image, Input} = ReactBootstrap;

  //Fetching Data
  const [query, setQuery] = useState('http://localhost:1337/api/products/');
  const [{ data, isLoading, isError, haveData }, doFetch] = useDataApi(query, cart,{data: [],});


  //Set Up Initial Product List
  if (items.length == 0) {
    axios.get('http://localhost:1337/api/products?populate=*')
      .then(response => {
        console.log('Fetched initial product list')
        console.log(response.data.data);
        setItems(response.data.data)
      })
  }
 
  // deduct or add item to stock
  function manageStock(action, id, name, qty){

    let url ='http://localhost:1337/api/products/' + id;
    let existingStock;
    let newStock;

    axios.get(url)
    .then(function (response) {
      console.log(response.data.data);

      if (action === "deduct") {
        existingStock = response.data.data.attributes.Stock;

        if (qty <= existingStock) {
          newStock = existingStock - qty;

        } else {
          let message = `${name} has snsufficient stock of ${existingStock}`;
          console.log(message);
          alert(message);
          return false};

      } else if (action === "stock") {
        existingStock = response.data.data.attributes.Stock;
        newStock = existingStock + qty;
  
      } else {
        return false;
      };

      updateProductDatabase (
        id,
        name,
        newStock,
        {
          "data": {
            "Stock": newStock
          }
        },
        );
    })
    .catch(function (error) {
      console.log(error);
      alert('Error:' + error);
      return false
    });
  return true;
}

  //UPDATE PRODUCT DATABASE
  function updateProductDatabase (id, name, stock, payload) {
    let url = "http://localhost:1337/api/products/" + id;

    axios
    .put(url, payload)
    .then(response => {
      console.log('Product Database updated');
      console.log(response.data)
      axios.get('http://localhost:1337/api/products?populate=*')
      .then(response => {
        console.log('Fetched updated product list')
        console.log(response.data.data);
        setItems(response.data.data)
      })
      
      })
    .catch(function (error) {
      alert('Error:' + error)
      console.log(error);
      return false
    })
    
    ;

  }

  const addToCart = (e) => {
    let name = e.target.name
    let id = e.target.id;
    let qty = 1;

     //manage stock
     if (!manageStock("deduct", id, name, qty)) return;
    
    let itemInfo = data.filter((item) => item.id == id);

    let item = [{
      id: itemInfo[0].id,
      name: itemInfo[0].attributes.Name,
      country: itemInfo[0].attributes.Country,
      cost: itemInfo[0].attributes.Cost,
      qty: qty
    }];

    console.log(`add ${name} to Cart ${JSON.stringify(item)}`);
    setCart([...cart, ...item]);
  };

  const deleteCartItem = (index) => {
    let id = cart[index].id;
    let name = cart[index].name;
    let qty = cart[index].qty;

    //remove item from cart
    let newCart = cart.filter((item, i) => index != i);

    //restockm the item
    if (!manageStock("stock", id, name, qty)) return;

    setCart(newCart);
   
  };

  let cartList = cart.map((item, index) => {
    return (
      <Accordion.Item key={1+index} id={item.id} eventKey={1 + index}>
      <Accordion.Header>
        Item: {item.name} <br/>
        Cost: {item.cost} <br/>
        Qty: {item.qty}
      </Accordion.Header>
      <Accordion.Body onClick={() => deleteCartItem(index)}
        eventKey={1 + index}>
        $ {item.cost} from {item.country}
      </Accordion.Body>
    </Accordion.Item>
    );
  });

  let finalList = () => {
    let total = checkOut();
    let final = cart.map((item, index) => {
      return (
        <div key={index} index={index}>
          Item: {item.name} <br/>
          Cost: {item.cost} <br/>
        </div>
      );
    });
    return { final, total };
  };

  const checkOut = () => {
    let costs = cart.map((item) => item.cost);
    const reducer = (accum, current) => accum + current;
    let newTotal = costs.reduce(reducer, 0);
    console.log(`total updated to ${newTotal}`);
    return newTotal;
  };

  if (items.length > 0 ) {
    list = items.map((item, index) => {

      return (
        <li key={index}>
          <Image src={item.attributes.Picture.data != null ? "/cartDB/public" + item.attributes.Picture.data.attributes.url : "/cartDB/public/uploads/placeholder.svg"} width={70} height={70} roundedCircle></Image>
          <Button variant="primary" size="large" onClick={(event) => setQuery('http://localhost:1337/api/products/' + item.id )}>
            Item: {item.attributes.Name} <br/>
            Cost: {item.attributes.Cost} <br/>
            Stock: {item.attributes.Stock}
          </Button>
          <input name={item.attributes.Name} id={item.id} type="submit" onClick={addToCart}></input>
        </li>
      );
    });
  console.log('Product List:' + list)
  }
  

  // TODO: implement the restockProducts function
  const restockProducts = (url) => {

    let newStock = 50;
    let payload =  {
      "data": {
        "Stock": newStock
      }
    }

    axios
    .put(url.query, payload)
    .then(response => {
      console.log('Product Restocked');
      console.log(response.data)
      axios.get('http://localhost:1337/api/products?populate=*')
      .then(response => {
        console.log('Fetched updated product list')
        console.log(response.data.data);
        setItems(response.data.data)
      })
      
      })
    .catch(function (error) {
      alert('Error Restocking:' + error)
      console.log(error);
      return false
    })
    

  };
  return (
    <Container>
      <Row>
        <Col>
          <h1>Product List</h1>
          <ul style={{ listStyleType: "none" }}>{list}</ul>
        </Col>
        <Col>
          <h1>Cart Contents</h1>
          <Accordion defaultActiveKey="0">{cartList}</Accordion>
        </Col>
        <Col>
          <h1>CheckOut </h1>
          <Button onClick={checkOut}>CheckOut $ {finalList().total}</Button>
          <div> {finalList().total > 0 && finalList().final} </div>
        </Col>
      </Row>
      <Row>
        <form
          onSubmit={(event) => {
            restockProducts({query});
            console.log(`Restock called on ${query}`);
            event.preventDefault();
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">ReStock Products</button>
        </form>
      </Row>
    </Container>
  );
};
// ========================================
ReactDOM.render(<Products />, document.getElementById("root"));
