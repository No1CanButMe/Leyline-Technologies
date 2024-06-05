import React from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";

import PartyA from "./PartyA";
import PartyB from "./PartyB";
import { SnackbarProvider } from "notistack";

import {
  Typography,
  Box,
  AppBar,
  Toolbar,
  Container,
  Button,
  Paper,
} from "@mui/material";

function App() {
  const location = useLocation();
  const isMainPage = location.pathname === "/";

  return (
    <SnackbarProvider maxSnack={3}>
      {isMainPage && (
        <AppBar position="static" style={{ backgroundColor: "#333" }}>
          <Toolbar sx={{ textAlign: "center" }}>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
              Leyline - Settlement System
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      <Container sx={{ marginTop: 4 }}>
        {isMainPage && (
          <Paper sx={{ padding: 4, textAlign: "center" }}>
            <Typography variant="h5" component="h1" gutterBottom>
              Welcome to the Settlement System
            </Typography>
            <Typography variant="body1" gutterBottom>
              Please select a party to continue:
            </Typography>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/party-a"
              sx={{ marginRight: 2 }}
            >
              Go to Party A
            </Button>
            <Button
              variant="contained"
              color="secondary"
              component={Link}
              to="/party-b/1"
            >
              Go to Party B (ID 1)
            </Button>
          </Paper>
        )}

        <Box sx={{ padding: 2 }}>
          <Routes>
            <Route path="/party-a" element={<PartyA />} />
            <Route path="/party-b/:settlementId" element={<PartyB />} />
          </Routes>
        </Box>
      </Container>
    </SnackbarProvider>
  );
}

export default App;
