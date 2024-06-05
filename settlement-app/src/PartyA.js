import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  AppBar,
  Toolbar,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";

function PartyA() {
  const [amount, setAmount] = useState("");
  const [settlements, setSettlements] = useState([]);
  const [editSettlementId, setEditSettlementId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const lastFetched = useRef(new Date());

  document.title = "Party A";

  const fetchSettlements = useCallback(() => {
    axios
      .get("http://localhost:8000/settlements/")
      .then((response) => {
        setSettlements(response.data);
        lastFetched.current = new Date();
      })
      .catch((error) => {
        console.error("Error fetching settlements:", error);
        enqueueSnackbar("Failed to fetch settlements.", { variant: "error" });
      });
  }, [enqueueSnackbar]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/general");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.counter_offered) {
        enqueueSnackbar(
          `Counter Offered: Settlement ID - ${data.id} ${data.status} with new amount of ${data.amount}`,
          { variant: "error" }
        );
      } else {
        enqueueSnackbar(
          `Accepted: Settlement ID - ${data.id} ${data.status} for ${data.amount}`,
          { variant: "success" }
        );
      }
    };

    fetchSettlements();

    return () => {
      ws.close();
    };
  }, [enqueueSnackbar, fetchSettlements]);

  const handleSubmit = async () => {
    if (!amount && !editAmount) {
      enqueueSnackbar("Amount is required.", { variant: "warning" });
      return;
    }

    if (editSettlementId) {
      try {
        const response = await axios.put(
          `http://localhost:8000/settlements/${editSettlementId}/`,
          {
            amount: parseFloat(editAmount),
            last_seen: lastFetched.current.toISOString(),
          }
        );
        const updatedSettlements = settlements.map((s) =>
          s.id === editSettlementId ? response.data : s
        );
        setSettlements(updatedSettlements);
        setEditSettlementId(null);
        setEditAmount("");
        enqueueSnackbar(
          `Settlement ${editSettlementId} updated successfully.`,
          { variant: "success" }
        );
      } catch (error) {
        console.log(error.response);
        if (error.response) {
          enqueueSnackbar(error.response.data.detail, { variant: "warning" });
        } else {
          enqueueSnackbar(
            `Failed to update settlement ID ${editSettlementId}.`,
            { variant: "error" }
          );
        }
      }
    } else {
      try {
        const response = await axios.post(
          "http://localhost:8000/settlements/",
          { amount: parseFloat(amount) }
        );
        setSettlements([...settlements, response.data]);
        setAmount("");
        enqueueSnackbar(`Settlement submitted successfully.`, {
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar("Failed to submit settlement.", { variant: "error" });
      }
    }
  };

  const handleEdit = (settlement) => {
    setEditSettlementId(settlement.id);
    setEditAmount(String(settlement.amount));
    setOpen(true);
  };

  const handleClose = () => {
    setEditSettlementId(null);
    setEditAmount("");
    setOpen(false);
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
        return "gray";
    }
  };

  const sortedSettlements = settlements.sort((a, b) => {
    const order = ["disputed", "pending", "agreed"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <div>
      <AppBar position="static" style={{ backgroundColor: "#333" }}>
        <Toolbar style={{ justifyContent: "center" }}>
          <Typography variant="h5">Party A</Typography>
        </Toolbar>
      </AppBar>
      <Grid container spacing={2} style={{ padding: "20px" }}>
        <Grid item xs={12}>
          <TextField
            label="Settlement Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            variant="outlined"
            fullWidth
          />
        </Grid>
        <Grid item xs={6} md={6}>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            fullWidth
          >
            Submit Settlement
          </Button>
        </Grid>
        <Grid item xs={6} md={6}>
          <Button
            onClick={fetchSettlements}
            variant="contained"
            color="secondary"
            fullWidth
          >
            Refresh Settlements
          </Button>
        </Grid>
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedSettlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell>{settlement.id}</TableCell>
                    <TableCell>${settlement.amount}</TableCell>
                    <TableCell
                      style={{ textTransform: "capitalize" }}
                      sx={{ fontWeight: "bold" }}
                    >
                      <Chip
                        label={settlement.status}
                        color={getStatusColor(settlement.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {settlement.status !== "agreed" && (
                        <Button
                          onClick={() => handleEdit(settlement)}
                          variant="outlined"
                          color="primary"
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>Edit Settlement for ID {editSettlementId}</DialogTitle>
          <DialogContent>
            <TextField
              label="Settlement Amount"
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              variant="filled"
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSubmit} color="primary">
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </div>
  );
}

export default PartyA;
