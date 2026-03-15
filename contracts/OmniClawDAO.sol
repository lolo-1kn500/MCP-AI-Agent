pragma solidity ^0.8.20;

contract OmniClawDAO {

 uint public proposalCount;

 function createProposal() public {

  proposalCount++;

 }

}