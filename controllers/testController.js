// Loh Ze Qing Norbert, A0277473R

//test controller

export const testController = (req, res) => {
    try {
        return res.status(200).send({
            success: true,
            message: "Protected route accessed successfully",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Error in Test",
            error,
        });
    }
};
