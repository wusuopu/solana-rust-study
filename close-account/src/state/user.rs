use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct User {
    pub name: String,
    pub age: u32,
}

impl User {
    pub const SEED_PREFIX: &'static str = "USER";
    pub const LEN: usize = 20;
}
