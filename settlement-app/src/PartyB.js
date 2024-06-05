import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Button,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  AppBar,
  Toolbar,
} from "@mui/material";
import { useSnackbar } from "notistack";

function PartyB() {
  const { settlementId } = useParams();
  const [settlement, setSettlement] = useState(null);
  const [newAmount, setNewAmount] = useState("");
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);

  document.title = `Party B - ${settlementId}`;

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${settlementId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      enqueueSnackbar(`Update - New Offer - $${data.amount}`, {
        variant: "warning",
      });

      fetchSettlement(settlementId);
    };

    fetchSettlement(settlementId);
    return () => {
      ws.close();
    };
  }, [settlementId, enqueueSnackbar]);

  const fetchSettlement = (settlementId) => {
    setLoading(true);
    axios
      .get(`http://localhost:8000/settlements/${settlementId}`)
      .then((response) => {
        setSettlement(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch settlement:", error);
        setLoading(false);
      });
  };

  const handleResponse = async (accepted) => {
    try {
      const data = {
        accepted,
        new_amount: accepted ? undefined : parseFloat(newAmount),
      };
      const response = await axios.post(
        `http://localhost:8000/settlements/${settlementId}/respond`,
        data
      );

      setSettlement(response.data);
      setNewAmount("");
      enqueueSnackbar(
        `Settlement ${accepted ? "accepted" : "counter offered"} successfully.`,
        {
          variant: "success",
        }
      );
    } catch (error) {
      console.log(error.response);
      enqueueSnackbar(error.response.data.detail, { variant: "error" });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "disputed":
        return "error";
      case "pending":
        return "warning";
      case "agreed":
        return "success";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        style={{ height: "100vh" }}
      >
        <CircularProgress />
      </Grid>
    );
  }

  return (
    <div>
      <AppBar position="static" style={{ backgroundColor: "#333" }}>
        <Toolbar style={{ justifyContent: "center" }}>
          <Typography variant="h5">Party B</Typography>
        </Toolbar>
      </AppBar>

      <Grid container justifyContent="center" style={{ padding: "20px" }}>
        {settlement && (
          <Card style={{ width: "100%", maxWidth: "600px" }}>
            <CardContent>
              <Typography variant="h5" component="div" gutterBottom>
                Settlement Details
              </Typography>
              <Typography variant="body1" component="div">
                <strong>Settlement ID:</strong> {settlement.id}
              </Typography>
              <Typography variant="body1" component="div">
                <strong>Current Amount:</strong> ${settlement.amount}
              </Typography>
              <Typography
                variant="body1"
                component="div"
                style={{
                  display: "flex",
                  alignItems: "center",
                  textTransform: "capitalize",
                }}
                sx={{ fontWeight: "bold" }}
              >
                <strong>Status:</strong> &nbsp;
                <Chip
                  label={settlement.status}
                  color={getStatusColor(settlement.status)}
                  size="small"
                />
              </Typography>
            </CardContent>
            <CardActions
              style={{
                flexDirection: "column",
                alignItems: "stretch",
                gap: "10px",
                padding: "16px",
              }}
            >
              <Button
                onClick={() => handleResponse(true)}
                color="primary"
                variant="contained"
                fullWidth
                disabled={settlement.status === "agreed"}
              >
                Accept Offer
              </Button>
              <TextField
                label="Counteroffer Amount"
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                variant="outlined"
                fullWidth
                disabled={
                  settlement.counter_offered || settlement.status === "agreed"
                }
              />
              <Button
                onClick={() => handleResponse(false)}
                color="secondary"
                variant="contained"
                fullWidth
                disabled={
                  settlement.counter_offered || settlement.status === "agreed"
                }
              >
                Counter Offer
              </Button>
            </CardActions>
          </Card>
        )}
      </Grid>
    </div>
  );
}

export default PartyB;
