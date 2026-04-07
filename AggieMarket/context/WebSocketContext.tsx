import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { API } from "../constants/api";

//wire in AggieMarket/app/_layout.tsx
//wrap <websocketProvider> </websocketProvider> in <authProvider> </authProvider>

//context should be 
    // opens a websocket to API.wsChat?token=${token} when authenticated
    //reconnects with exponential backoff (1s -> 2s -> 4s ->...->30s max)